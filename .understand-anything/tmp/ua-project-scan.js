import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRootArg = process.argv[2];
const outputPathArg = process.argv[3];

function fail(message, error) {
  const detail = error instanceof Error ? `: ${error.message}` : "";
  process.stderr.write(`Fatal scan error: ${message}${detail}\n`);
  process.exit(1);
}

if (!projectRootArg || !outputPathArg) {
  fail("Expected a project root and an output JSON path");
}

const projectRoot = path.resolve(projectRootArg);
const outputPath = path.resolve(outputPathArg);

try {
  if (!existsSync(projectRoot) || !lstatSync(projectRoot).isDirectory()) {
    fail(`Project root is not an accessible directory: ${projectRoot}`);
  }
} catch (error) {
  fail(`Cannot access project root: ${projectRoot}`, error);
}

const toPosix = (value) => value.replaceAll("\\", "/");
const comparePaths = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function isExistingFile(relativePath) {
  try {
    return lstatSync(path.join(projectRoot, relativePath)).isFile();
  } catch {
    return false;
  }
}

function discoverWithGit() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: projectRoot,
    encoding: "buffer",
    windowsHide: true,
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.status !== 0 || result.error) return null;
  return result.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map(toPosix);
}

function discoverRecursively() {
  const discovered = [];
  const walk = (absoluteDir) => {
    let entries;
    try {
      entries = readdirSync(absoluteDir, { withFileTypes: true });
    } catch (error) {
      process.stderr.write(`Warning: cannot read ${absoluteDir}: ${error.message}\n`);
      return;
    }
    for (const entry of entries) {
      const absolutePath = path.join(absoluteDir, entry.name);
      const relativePath = toPosix(path.relative(projectRoot, absolutePath));
      if (entry.isDirectory()) {
        if (entry.name === ".git") continue;
        walk(absolutePath);
      } else if (entry.isFile()) {
        discovered.push(relativePath);
      }
    }
  };
  walk(projectRoot);
  return discovered;
}

const directoryExclusions = new Set([
  "node_modules",
  ".git",
  "vendor",
  "venv",
  ".venv",
  "__pycache__",
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".cache",
  ".turbo",
  "target",
  "obj",
  ".idea",
  ".vscode",
]);

const binaryExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp3",
  ".mp4",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
]);

function isBaselineIgnored(relativePath) {
  const normalized = toPosix(relativePath);
  const parts = normalized.split("/");
  const directoryParts = parts.slice(0, -1);
  if (directoryParts.some((segment) => directoryExclusions.has(segment))) return true;

  const basename = parts.at(-1) ?? "";
  const lowerBasename = basename.toLowerCase();
  const extension = path.posix.extname(lowerBasename);

  if (
    lowerBasename.endsWith(".lock") ||
    lowerBasename === "package-lock.json" ||
    lowerBasename === "yarn.lock" ||
    lowerBasename === "pnpm-lock.yaml"
  ) return true;
  if (binaryExtensions.has(extension)) return true;
  if (
    lowerBasename.endsWith(".min.js") ||
    lowerBasename.endsWith(".min.css") ||
    lowerBasename.endsWith(".map") ||
    /\.generated\.[^/]+$/i.test(basename)
  ) return true;
  if (
    basename === "LICENSE" ||
    basename === ".gitignore" ||
    basename === ".editorconfig" ||
    basename === ".prettierrc" ||
    basename.startsWith(".eslintrc") ||
    lowerBasename.endsWith(".log")
  ) return true;
  return false;
}

async function applyConfiguredFiltering(originalFiles) {
  const projectIgnore = path.join(projectRoot, ".understand-anything", ".understandignore");
  const rootIgnore = path.join(projectRoot, ".understandignore");
  const hasUserIgnore = existsSync(projectIgnore) || existsSync(rootIgnore);
  const baselineFiles = originalFiles.filter((file) => !isBaselineIgnored(file));
  if (!hasUserIgnore) {
    return { files: baselineFiles, filteredByIgnore: 0 };
  }

  const coreCandidates = [
    process.env.UA_CORE_IGNORE_FILTER,
    path.join(
      process.env.USERPROFILE ?? "",
      ".understand-anything",
      "repo",
      "understand-anything-plugin",
      "packages",
      "core",
      "dist",
      "ignore-filter.js",
    ),
  ].filter(Boolean);

  const coreModulePath = coreCandidates.find((candidate) => existsSync(candidate));
  if (!coreModulePath) {
    throw new Error("Cannot locate @understand-anything/core ignore-filter.js");
  }

  const { createIgnoreFilter } = await import(pathToFileURL(coreModulePath).href);
  if (typeof createIgnoreFilter !== "function") {
    throw new Error("@understand-anything/core does not export createIgnoreFilter");
  }
  const filter = createIgnoreFilter(projectRoot);
  const files = originalFiles.filter((file) => !filter.isIgnored(file));
  const baselineSet = new Set(baselineFiles);
  const unifiedSet = new Set(files);
  const filteredByIgnore = [...baselineSet].filter((file) => !unifiedSet.has(file)).length;
  return { files, filteredByIgnore };
}

const languageByExtension = new Map([
  [".ts", "typescript"],
  [".tsx", "typescript"],
  [".js", "javascript"],
  [".jsx", "javascript"],
  [".py", "python"],
  [".go", "go"],
  [".rs", "rust"],
  [".java", "java"],
  [".rb", "ruby"],
  [".cpp", "cpp"],
  [".cc", "cpp"],
  [".cxx", "cpp"],
  [".h", "cpp"],
  [".hpp", "cpp"],
  [".c", "c"],
  [".cs", "csharp"],
  [".swift", "swift"],
  [".kt", "kotlin"],
  [".php", "php"],
  [".vue", "vue"],
  [".svelte", "svelte"],
  [".sh", "shell"],
  [".bash", "shell"],
  [".ps1", "powershell"],
  [".bat", "batch"],
  [".cmd", "batch"],
  [".md", "markdown"],
  [".rst", "markdown"],
  [".yaml", "yaml"],
  [".yml", "yaml"],
  [".json", "json"],
  [".jsonc", "jsonc"],
  [".toml", "toml"],
  [".sql", "sql"],
  [".graphql", "graphql"],
  [".gql", "graphql"],
  [".proto", "protobuf"],
  [".tf", "terraform"],
  [".tfvars", "terraform"],
  [".html", "html"],
  [".htm", "html"],
  [".css", "css"],
  [".scss", "css"],
  [".sass", "css"],
  [".less", "css"],
  [".xml", "xml"],
  [".cfg", "config"],
  [".ini", "config"],
  [".env", "config"],
]);

function detectLanguage(relativePath) {
  const basename = path.posix.basename(relativePath);
  if (basename === "Dockerfile") return "dockerfile";
  if (basename === "Makefile") return "makefile";
  if (basename === "Jenkinsfile") return "jenkinsfile";
  if (basename === ".env" || basename.startsWith(".env.")) return "config";
  const extension = path.posix.extname(basename).toLowerCase();
  return languageByExtension.get(extension) ?? (extension.slice(1) || "unknown");
}

const docsExtensions = new Set([".md", ".rst", ".txt"]);
const configExtensions = new Set([
  ".yaml", ".yml", ".json", ".jsonc", ".toml", ".xml", ".cfg", ".ini", ".env",
]);
const dataExtensions = new Set([".sql", ".graphql", ".gql", ".proto", ".prisma", ".csv"]);
const scriptExtensions = new Set([".sh", ".bash", ".ps1", ".bat"]);
const markupExtensions = new Set([".html", ".htm", ".css", ".scss", ".sass", ".less"]);

function isInfrastructureFile(relativePath) {
  const normalized = toPosix(relativePath);
  const lower = normalized.toLowerCase();
  const basename = path.posix.basename(normalized);
  return (
    basename === "Dockerfile" ||
    /^docker-compose\./i.test(basename) ||
    /\.(tf|tfvars)$/i.test(basename) ||
    basename === "Makefile" ||
    basename === "Jenkinsfile" ||
    basename === "Procfile" ||
    basename === "Vagrantfile" ||
    lower.startsWith(".github/workflows/") ||
    lower === ".gitlab-ci.yml" ||
    lower.startsWith(".circleci/") ||
    /\.k8s\.ya?ml$/i.test(basename) ||
    lower.startsWith("k8s/") ||
    lower.includes("/k8s/") ||
    lower.startsWith("kubernetes/") ||
    lower.includes("/kubernetes/")
  );
}

function detectCategory(relativePath) {
  const normalized = toPosix(relativePath);
  const basename = path.posix.basename(normalized);
  const extension = path.posix.extname(basename).toLowerCase();
  if (docsExtensions.has(extension) && basename !== "LICENSE") return "docs";
  if (isInfrastructureFile(normalized)) return "infra";
  if (dataExtensions.has(extension) || basename.toLowerCase().endsWith(".schema.json")) return "data";
  if (
    configExtensions.has(extension) ||
    basename === "tsconfig.json" ||
    basename === "package.json" ||
    basename === "pyproject.toml" ||
    basename === "Cargo.toml" ||
    basename === "go.mod" ||
    basename === ".env" ||
    basename.startsWith(".env.")
  ) return "config";
  if (scriptExtensions.has(extension)) return "script";
  if (markupExtensions.has(extension)) return "markup";
  return "code";
}

function locateWc() {
  const direct = spawnSync("wc", ["--version"], { encoding: "utf8", windowsHide: true });
  if (!direct.error && direct.status === 0) return "wc";
  if (process.platform === "win32") {
    const whereGit = spawnSync("where.exe", ["git"], { encoding: "utf8", windowsHide: true });
    if (whereGit.status === 0) {
      const gitPath = whereGit.stdout.split(/\r?\n/).find(Boolean);
      if (gitPath) {
        const candidate = path.join(path.dirname(path.dirname(gitPath)), "usr", "bin", "wc.exe");
        if (existsSync(candidate)) return candidate;
      }
    }
    const standardGitWc = "C:\\Program Files\\Git\\usr\\bin\\wc.exe";
    if (existsSync(standardGitWc)) return standardGitWc;
  }
  return null;
}

const wcExecutable = locateWc();

function countLines(relativePath) {
  if (wcExecutable) {
    const result = spawnSync(wcExecutable, ["-l", "--", relativePath], {
      cwd: projectRoot,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
    });
    const match = result.status === 0 ? result.stdout.match(/^\s*(\d+)/) : null;
    if (match) return Number.parseInt(match[1], 10);
  }
  try {
    const content = readFileSync(path.join(projectRoot, relativePath));
    let lines = 0;
    for (const byte of content) if (byte === 10) lines += 1;
    return lines;
  } catch (error) {
    process.stderr.write(`Warning: cannot count lines in ${relativePath}: ${error.message}\n`);
    return 0;
  }
}

function readTextIfPresent(relativePath) {
  try {
    const absolutePath = path.join(projectRoot, relativePath);
    return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : "";
  } catch (error) {
    process.stderr.write(`Warning: cannot read ${relativePath}: ${error.message}\n`);
    return "";
  }
}

function parseJson(text, label) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    process.stderr.write(`Warning: cannot parse ${label}: ${error.message}\n`);
    return null;
  }
}

function stripJsonComments(text) {
  let result = "";
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (lineComment) {
      if (char === "\n") {
        lineComment = false;
        result += char;
      }
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      } else if (char === "\n") {
        result += char;
      }
      continue;
    }
    if (inString) {
      result += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      result += char;
    } else if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
    } else if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
    } else {
      result += char;
    }
  }
  return result.replace(/,\s*([}\]])/g, "$1");
}

function parseJsonc(text, label) {
  if (!text) return null;
  try {
    return JSON.parse(stripJsonComments(text));
  } catch (error) {
    process.stderr.write(`Warning: cannot parse ${label}: ${error.message}\n`);
    return null;
  }
}

function collectFrameworkMetadata(discoveredFiles) {
  const frameworks = new Set();
  let name = path.basename(projectRoot);
  let rawDescription = "";

  const packageJson = parseJson(readTextIfPresent("package.json"), "package.json");
  if (packageJson) {
    if (typeof packageJson.name === "string" && packageJson.name.trim()) name = packageJson.name.trim();
    if (typeof packageJson.description === "string") rawDescription = packageJson.description.trim();
    const dependencies = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
    };
    const frameworkDependencies = new Map([
      ["react", "React"],
      ["vue", "Vue"],
      ["svelte", "Svelte"],
      ["@angular/core", "Angular"],
      ["express", "Express"],
      ["fastify", "Fastify"],
      ["koa", "Koa"],
      ["next", "Next.js"],
      ["nuxt", "Nuxt"],
      ["vite", "Vite"],
      ["vitest", "Vitest"],
      ["jest", "Jest"],
      ["mocha", "Mocha"],
      ["tailwindcss", "Tailwind CSS"],
      ["prisma", "Prisma"],
      ["typeorm", "TypeORM"],
      ["sequelize", "Sequelize"],
      ["mongoose", "Mongoose"],
      ["redux", "Redux"],
      ["zustand", "Zustand"],
      ["mobx", "MobX"],
    ]);
    for (const dependency of Object.keys(dependencies)) {
      const detected = frameworkDependencies.get(dependency);
      if (detected) frameworks.add(detected);
      if (dependency === "@reduxjs/toolkit" || dependency === "react-redux") frameworks.add("Redux");
    }
  }

  if (existsSync(path.join(projectRoot, "tsconfig.json"))) frameworks.add("TypeScript");

  const cargoText = readTextIfPresent("Cargo.toml");
  if (!packageJson && cargoText) {
    const packageBlock = cargoText.match(/\[package\]([\s\S]*?)(?=\n\s*\[|$)/);
    const nameMatch = packageBlock?.[1].match(/^\s*name\s*=\s*["']([^"']+)["']/m);
    if (nameMatch) name = nameMatch[1];
  }
  if (cargoText) {
    frameworks.add("Rust");
    const rustFrameworks = new Map([
      ["actix-web", "Actix Web"], ["axum", "Axum"], ["rocket", "Rocket"],
      ["diesel", "Diesel"], ["tokio", "Tokio"], ["serde", "Serde"], ["warp", "Warp"],
    ]);
    for (const [dependency, framework] of rustFrameworks) {
      if (new RegExp(`^\\s*${dependency.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=`, "m").test(cargoText)) {
        frameworks.add(framework);
      }
    }
  }

  const goModText = readTextIfPresent("go.mod");
  if (!packageJson && !cargoText && goModText) {
    const moduleMatch = goModText.match(/^\s*module\s+(\S+)/m);
    if (moduleMatch) name = moduleMatch[1].split("/").at(-1);
  }
  if (goModText) {
    frameworks.add("Go");
    const goFrameworks = new Map([
      ["github.com/gin-gonic/gin", "Gin"], ["github.com/labstack/echo", "Echo"],
      ["github.com/gofiber/fiber", "Fiber"], ["github.com/go-chi/chi", "Chi"], ["gorm.io/gorm", "GORM"],
    ]);
    for (const [modulePath, framework] of goFrameworks) {
      if (goModText.includes(modulePath)) frameworks.add(framework);
    }
  }

  const pythonManifestNames = ["requirements.txt", "pyproject.toml", "setup.py", "setup.cfg", "Pipfile"];
  const pythonTexts = pythonManifestNames.map(readTextIfPresent).filter(Boolean);
  if (pythonTexts.length) {
    frameworks.add("Python");
    const combined = pythonTexts.join("\n").toLowerCase();
    const pythonFrameworks = new Map([
      ["django", "Django"], ["djangorestframework", "Django REST Framework"], ["fastapi", "FastAPI"],
      ["flask", "Flask"], ["sqlalchemy", "SQLAlchemy"], ["alembic", "Alembic"], ["celery", "Celery"],
      ["pydantic", "Pydantic"], ["uvicorn", "Uvicorn"], ["gunicorn", "Gunicorn"], ["aiohttp", "aiohttp"],
      ["tornado", "Tornado"], ["starlette", "Starlette"], ["pytest", "pytest"],
      ["hypothesis", "Hypothesis"], ["channels", "Channels"],
    ]);
    for (const [dependency, framework] of pythonFrameworks) {
      const expression = new RegExp(`(^|[^a-z0-9_-])${dependency.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9_-]|$)`, "i");
      if (expression.test(combined)) frameworks.add(framework);
    }
    if (!packageJson && !cargoText && !goModText) {
      const pyproject = readTextIfPresent("pyproject.toml");
      const projectName = pyproject.match(/\[project\][\s\S]*?^\s*name\s*=\s*["']([^"']+)["']/m)
        ?? pyproject.match(/\[tool\.poetry\][\s\S]*?^\s*name\s*=\s*["']([^"']+)["']/m);
      if (projectName) name = projectName[1];
    }
  }

  const gemfileText = readTextIfPresent("Gemfile");
  if (gemfileText) {
    frameworks.add("Ruby");
    const rubyFrameworks = new Map([
      ["rails", "Rails"], ["railties", "Railties"], ["sinatra", "Sinatra"], ["grape", "Grape"],
      ["rspec", "RSpec"], ["sidekiq", "Sidekiq"], ["activerecord", "Active Record"],
      ["actionpack", "Action Pack"], ["devise", "Devise"], ["pundit", "Pundit"],
    ]);
    for (const [gem, framework] of rubyFrameworks) {
      if (new RegExp(`gem\\s+["']${gem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i").test(gemfileText)) {
        frameworks.add(framework);
      }
    }
  }

  const jvmText = ["pom.xml", "build.gradle", "build.gradle.kts"].map(readTextIfPresent).filter(Boolean).join("\n");
  if (jvmText) {
    frameworks.add(existsSync(path.join(projectRoot, "build.gradle.kts")) ? "Kotlin" : "Java");
    const jvmFrameworks = new Map([
      ["spring-boot", "Spring Boot"], ["spring-web", "Spring Web"], ["spring-data", "Spring Data"],
      ["quarkus", "Quarkus"], ["micronaut", "Micronaut"], ["hibernate", "Hibernate"],
      ["jakarta", "Jakarta"], ["junit", "JUnit"], ["ktor", "Ktor"],
    ]);
    for (const [keyword, framework] of jvmFrameworks) {
      if (jvmText.toLowerCase().includes(keyword)) frameworks.add(framework);
    }
  }

  if (discoveredFiles.includes("Dockerfile")) frameworks.add("Docker");
  if (discoveredFiles.some((file) => /^docker-compose\.ya?ml$/i.test(file))) frameworks.add("Docker Compose");
  if (discoveredFiles.some((file) => file.toLowerCase().endsWith(".tf"))) frameworks.add("Terraform");
  if (discoveredFiles.some((file) => /^\.github\/workflows\/.*\.ya?ml$/i.test(file))) frameworks.add("GitHub Actions");
  if (discoveredFiles.includes(".gitlab-ci.yml")) frameworks.add("GitLab CI");
  if (discoveredFiles.includes("Jenkinsfile")) frameworks.add("Jenkins");

  return { name, rawDescription, frameworks: [...frameworks].sort(comparePaths), goModText };
}

function collectTsAliasRules() {
  const configs = [];
  const visited = new Set();
  const visit = (relativeConfigPath) => {
    const normalized = toPosix(path.posix.normalize(relativeConfigPath));
    if (visited.has(normalized)) return;
    visited.add(normalized);
    const text = readTextIfPresent(normalized);
    const parsed = parseJsonc(text, normalized);
    if (!parsed) return;
    configs.push({ path: normalized, parsed });
    if (typeof parsed.extends === "string" && parsed.extends.startsWith(".")) {
      let extended = path.posix.join(path.posix.dirname(normalized), parsed.extends);
      if (!path.posix.extname(extended)) extended += ".json";
      visit(extended);
    }
    if (Array.isArray(parsed.references)) {
      for (const reference of parsed.references) {
        if (!reference || typeof reference.path !== "string") continue;
        let referenced = path.posix.join(path.posix.dirname(normalized), reference.path);
        if (!path.posix.extname(referenced)) referenced = path.posix.join(referenced, "tsconfig.json");
        if (!existsSync(path.join(projectRoot, referenced)) && !referenced.endsWith(".json")) referenced += ".json";
        if (!existsSync(path.join(projectRoot, referenced)) && existsSync(path.join(projectRoot, `${reference.path}.json`))) {
          referenced = `${reference.path}.json`;
        }
        visit(referenced);
      }
    }
  };
  if (existsSync(path.join(projectRoot, "tsconfig.json"))) visit("tsconfig.json");

  const rules = [];
  for (const config of configs) {
    const compilerOptions = config.parsed.compilerOptions ?? {};
    const paths = compilerOptions.paths;
    if (!paths || typeof paths !== "object") continue;
    const configDir = path.posix.dirname(config.path);
    const baseUrl = typeof compilerOptions.baseUrl === "string" ? compilerOptions.baseUrl : ".";
    for (const [alias, targets] of Object.entries(paths)) {
      if (!Array.isArray(targets)) continue;
      rules.push({ alias, targets: targets.filter((target) => typeof target === "string"), configDir, baseUrl });
    }
  }
  return rules;
}

const extensionProbes = [
  ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js", "/index.tsx", "/index.jsx",
  ".py", ".go", ".rs", ".rb",
];

function normalizeCandidate(candidate) {
  const normalized = toPosix(path.posix.normalize(candidate)).replace(/^\.\//, "");
  if (!normalized || normalized === "." || normalized === ".." || normalized.startsWith("../")) return null;
  return normalized;
}

function createImportMap(files, fileSet, goModText) {
  const importMap = Object.fromEntries(files.map((file) => [file.path, []]));
  const aliasRules = collectTsAliasRules();
  const sortedFilePaths = files.map((file) => file.path).sort(comparePaths);
  const composerJson = parseJson(readTextIfPresent("composer.json"), "composer.json");
  const psr4 = composerJson?.autoload?.["psr-4"] ?? {};
  const goModule = goModText.match(/^\s*module\s+(\S+)/m)?.[1] ?? "";

  const probe = (basePath, customProbes = extensionProbes) => {
    const normalizedBase = normalizeCandidate(basePath);
    if (!normalizedBase) return null;
    const hasExtension = Boolean(path.posix.extname(normalizedBase));
    const candidates = hasExtension
      ? [normalizedBase]
      : [normalizedBase, ...customProbes.map((suffix) => `${normalizedBase}${suffix}`)];
    return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
  };

  const resolveAlias = (specifier) => {
    for (const rule of aliasRules) {
      const starIndex = rule.alias.indexOf("*");
      let wildcard = "";
      if (starIndex >= 0) {
        const prefix = rule.alias.slice(0, starIndex);
        const suffix = rule.alias.slice(starIndex + 1);
        if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) continue;
        wildcard = specifier.slice(prefix.length, specifier.length - suffix.length || undefined);
      } else if (specifier !== rule.alias) {
        continue;
      }
      for (const target of rule.targets) {
        const substituted = target.replace("*", wildcard);
        const candidate = path.posix.join(rule.configDir, rule.baseUrl, substituted);
        const resolved = probe(candidate);
        if (resolved) return resolved;
      }
    }
    return null;
  };

  const resolveJavaLike = (qualifiedName, extension) => {
    const withoutWildcard = qualifiedName.replace(/\.\*$/, "");
    const suffix = `${withoutWildcard.replaceAll(".", "/")}${extension}`;
    return sortedFilePaths.find((candidate) => candidate === suffix || candidate.endsWith(`/${suffix}`)) ?? null;
  };

  const resolveRustModule = (baseDirectory, components) => {
    for (let length = components.length; length > 0; length -= 1) {
      const base = path.posix.join(baseDirectory, ...components.slice(0, length));
      const resolved = probe(base, [".rs", "/mod.rs"]);
      if (resolved) return resolved;
    }
    return null;
  };

  for (const file of files) {
    if (file.fileCategory !== "code") continue;
    let content;
    try {
      content = readFileSync(path.join(projectRoot, file.path), "utf8");
    } catch (error) {
      process.stderr.write(`Warning: cannot resolve imports for ${file.path}: ${error.message}\n`);
      continue;
    }
    const imports = new Set();
    const directory = path.posix.dirname(file.path);

    if (file.language === "typescript" || file.language === "javascript") {
      const specifiers = [];
      const importExpression = /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g;
      const requireExpression = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;
      let match;
      while ((match = importExpression.exec(content))) specifiers.push(match[1]);
      while ((match = requireExpression.exec(content))) specifiers.push(match[1]);
      for (const rawSpecifier of specifiers) {
        const specifier = rawSpecifier.split(/[?#]/, 1)[0];
        let resolved = null;
        if (specifier.startsWith("./") || specifier.startsWith("../")) {
          resolved = probe(path.posix.join(directory, specifier));
        } else {
          resolved = resolveAlias(specifier);
        }
        if (resolved) imports.add(resolved);
      }
    } else if (file.language === "python") {
      const resolvePythonModule = (modulePath, baseDirectory = "") => {
        const moduleBase = path.posix.join(baseDirectory, modulePath.replaceAll(".", "/"));
        const moduleFile = normalizeCandidate(`${moduleBase}.py`);
        const packageFile = normalizeCandidate(path.posix.join(moduleBase, "__init__.py"));
        if (moduleFile && fileSet.has(moduleFile)) return { path: moduleFile, packageBase: null };
        if (packageFile && fileSet.has(packageFile)) return { path: packageFile, packageBase: moduleBase };
        return null;
      };
      let match;
      const plainImport = /^\s*import\s+([^#\n]+)/gm;
      while ((match = plainImport.exec(content))) {
        for (const part of match[1].split(",")) {
          const moduleName = part.trim().split(/\s+as\s+/)[0];
          const resolved = resolvePythonModule(moduleName);
          if (resolved) imports.add(resolved.path);
        }
      }
      const fromImport = /^\s*from\s+([.]*)([\w.]*)\s+import\s+([^#\n]+)/gm;
      while ((match = fromImport.exec(content))) {
        const dots = match[1].length;
        const moduleName = match[2];
        let baseDirectory = "";
        if (dots > 0) {
          baseDirectory = directory;
          for (let level = 1; level < dots; level += 1) baseDirectory = path.posix.dirname(baseDirectory);
        }
        const resolved = moduleName
          ? resolvePythonModule(moduleName, baseDirectory)
          : { path: null, packageBase: baseDirectory };
        if (resolved?.path) imports.add(resolved.path);
        if (resolved?.packageBase) {
          const names = match[3].replace(/[()]/g, "").split(",");
          for (const importedName of names) {
            const name = importedName.trim().split(/\s+as\s+/)[0];
            if (!/^\w+$/.test(name)) continue;
            const submodule = resolvePythonModule(name, resolved.packageBase);
            if (submodule) imports.add(submodule.path);
          }
        }
      }
    } else if (file.language === "go" && goModule) {
      const importPaths = [];
      const goImports = /\bimport\s*(?:\(([\s\S]*?)\)|"([^"]+)")/g;
      let match;
      while ((match = goImports.exec(content))) {
        if (match[2]) importPaths.push(match[2]);
        else {
          const quoted = /"([^"]+)"/g;
          let quotedMatch;
          while ((quotedMatch = quoted.exec(match[1]))) importPaths.push(quotedMatch[1]);
        }
      }
      for (const importPath of importPaths) {
        if (importPath !== goModule && !importPath.startsWith(`${goModule}/`)) continue;
        const packageDirectory = importPath === goModule ? "" : importPath.slice(goModule.length + 1);
        const directMatches = sortedFilePaths.filter((candidate) => {
          return path.posix.dirname(candidate) === packageDirectory && candidate.endsWith(".go");
        });
        for (const resolved of directMatches) imports.add(resolved);
      }
    } else if (file.language === "rust") {
      let match;
      const useExpression = /\buse\s+(crate|super(?:::\s*super)*)::([^;{]+)/g;
      while ((match = useExpression.exec(content))) {
        const prefix = match[1].replaceAll(/\s/g, "");
        const components = match[2].replace(/[{}]/g, "").split("::").map((part) => part.trim()).filter(Boolean);
        let baseDirectory = "src";
        if (prefix.startsWith("super")) {
          baseDirectory = directory;
          for (const token of prefix.split("::")) if (token === "super") baseDirectory = path.posix.dirname(baseDirectory);
        }
        const resolved = resolveRustModule(baseDirectory, components);
        if (resolved) imports.add(resolved);
      }
      const modExpression = /\bmod\s+([A-Za-z_]\w*)\s*;/g;
      while ((match = modExpression.exec(content))) {
        const resolved = probe(path.posix.join(directory, match[1]), [".rs", "/mod.rs"]);
        if (resolved) imports.add(resolved);
      }
    } else if (file.language === "java" || file.language === "kotlin") {
      const expression = file.language === "java"
        ? /^\s*import\s+(?:static\s+)?([\w.*]+)\s*;/gm
        : /^\s*import\s+([\w.*]+)/gm;
      let match;
      while ((match = expression.exec(content))) {
        const resolved = resolveJavaLike(match[1], file.language === "java" ? ".java" : ".kt");
        if (resolved) imports.add(resolved);
      }
    } else if (file.language === "ruby") {
      let match;
      const relativeRequire = /\brequire_relative\s*["']([^"']+)["']/g;
      while ((match = relativeRequire.exec(content))) {
        const resolved = probe(path.posix.join(directory, match[1]), [".rb"]);
        if (resolved) imports.add(resolved);
      }
      const loadPathRequire = /\brequire\s*["']([^"']+)["']/g;
      while ((match = loadPathRequire.exec(content))) {
        for (const prefix of ["lib", "app", ""]) {
          const resolved = probe(path.posix.join(prefix, match[1]), [".rb"]);
          if (resolved) {
            imports.add(resolved);
            break;
          }
        }
      }
    } else if (file.language === "php") {
      const useExpression = /^\s*use\s+([^;]+);/gm;
      let match;
      while ((match = useExpression.exec(content))) {
        const namespace = match[1].trim().split(/\s+as\s+/i)[0].replace(/^\\/, "");
        for (const [prefix, mappedDirectories] of Object.entries(psr4)) {
          const cleanPrefix = prefix.replace(/^\\/, "");
          if (!namespace.startsWith(cleanPrefix)) continue;
          const suffix = namespace.slice(cleanPrefix.length).replaceAll("\\", "/");
          const directories = Array.isArray(mappedDirectories) ? mappedDirectories : [mappedDirectories];
          for (const mappedDirectory of directories) {
            if (typeof mappedDirectory !== "string") continue;
            const resolved = probe(path.posix.join(toPosix(mappedDirectory), suffix), [".php"]);
            if (resolved) imports.add(resolved);
          }
        }
      }
    } else if (file.language === "c" || file.language === "cpp") {
      const includeExpression = /^\s*#\s*include\s*["<]([^">]+)[">]/gm;
      let match;
      while ((match = includeExpression.exec(content))) {
        const includePath = toPosix(match[1]);
        const bases = [path.posix.join(directory, includePath), path.posix.join("include", includePath), path.posix.join("src", includePath), includePath];
        for (const base of bases) {
          const resolved = probe(base, [".h", ".hpp", ".hxx", ".cuh"]);
          if (resolved) {
            imports.add(resolved);
            break;
          }
        }
      }
    }
    importMap[file.path] = [...imports].sort(comparePaths);
  }
  return importMap;
}

try {
  const gitFiles = discoverWithGit();
  const originalFiles = (gitFiles ?? discoverRecursively())
    .filter(isExistingFile)
    .filter((file, index, all) => all.indexOf(file) === index)
    .sort(comparePaths);
  const { files: filteredPaths, filteredByIgnore } = await applyConfiguredFiltering(originalFiles);
  const sortedPaths = filteredPaths.sort(comparePaths);
  const files = sortedPaths.map((relativePath) => ({
    path: relativePath,
    language: detectLanguage(relativePath),
    sizeLines: countLines(relativePath),
    fileCategory: detectCategory(relativePath),
  }));
  const languages = [...new Set(files.map((file) => file.language))].sort(comparePaths);
  const metadata = collectFrameworkMetadata(sortedPaths);
  const totalFiles = files.length;
  const estimatedComplexity = totalFiles <= 30
    ? "small"
    : totalFiles <= 150
      ? "moderate"
      : totalFiles <= 500
        ? "large"
        : "very-large";
  const fileSet = new Set(sortedPaths);
  const importMap = createImportMap(files, fileSet, metadata.goModText);
  const readmeText = readTextIfPresent("README.md");
  const readmeHead = readmeText ? readmeText.split(/\r?\n/).slice(0, 10).join("\n") : "";

  const result = {
    scriptCompleted: true,
    name: metadata.name,
    rawDescription: metadata.rawDescription,
    readmeHead,
    languages,
    frameworks: metadata.frameworks,
    files,
    totalFiles,
    filteredByIgnore,
    estimatedComplexity,
    importMap,
  };

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  process.exit(0);
} catch (error) {
  fail("Scanner execution failed", error);
}
