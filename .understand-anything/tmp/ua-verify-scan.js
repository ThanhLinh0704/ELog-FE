import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.argv[2] ?? ".");
const rawPath = path.join(projectRoot, ".understand-anything", "tmp", "ua-scan-results.json");
const finalPath = path.join(projectRoot, ".understand-anything", "intermediate", "scan-result.json");
const raw = JSON.parse(readFileSync(rawPath, "utf8"));
const result = JSON.parse(readFileSync(finalPath, "utf8"));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const stable = (value) => JSON.stringify(value);
const expectedKeys = [
  "name", "description", "languages", "frameworks", "files", "totalFiles",
  "filteredByIgnore", "estimatedComplexity", "importMap",
];
const preservedKeys = [
  "name", "languages", "frameworks", "files", "totalFiles", "filteredByIgnore",
  "estimatedComplexity", "importMap",
];
const categories = new Set(["code", "config", "docs", "infra", "data", "script", "markup"]);
const knownUntracked = new Set([
  "l3_test_results.json",
  "src/Test/add_kpi_l3.js",
  "src/Test/add_us19_l4.js",
  "src/Test/e2e/us10-trip-planning.cy.ts",
  "src/Test/e2e/us19-kpi-dashboard.cy.ts",
  "src/Test/update_sc11.js",
  "test_kpi.cjs",
  "test_kpi.js",
]);

check(raw.scriptCompleted === true, "scriptCompleted is not true in the raw scan");
check(stable(Object.keys(result)) === stable(expectedKeys), "final top-level keys do not match the required schema/order");
check(!Object.hasOwn(result, "scriptCompleted"), "final output retains scriptCompleted");
check(!Object.hasOwn(result, "rawDescription"), "final output retains rawDescription");
check(!Object.hasOwn(result, "readmeHead"), "final output retains readmeHead");
for (const key of preservedKeys) check(stable(result[key]) === stable(raw[key]), `field changed during Phase 2: ${key}`);
check(typeof result.description === "string" && result.description.trim().length > 0, "description is empty");
check(result.description.includes("Lưu ý: dự án có hơn 100 tệp nguồn"), "required over-100-files note is missing");
check(Array.isArray(result.files), "files is not an array");
check(result.totalFiles === result.files.length, "totalFiles differs from files.length");
check(Number.isInteger(result.filteredByIgnore) && result.filteredByIgnore >= 0, "filteredByIgnore is invalid");
check(["small", "moderate", "large", "very-large"].includes(result.estimatedComplexity), "invalid complexity value");

const paths = result.files.map((file) => file.path);
const pathSet = new Set(paths);
const sortedPaths = [...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
check(pathSet.size === paths.length, "duplicate file paths found");
check(stable(paths) === stable(sortedPaths), "file paths are not sorted");
check(paths.every((filePath) => typeof filePath === "string" && !path.isAbsolute(filePath) && !filePath.startsWith("../")), "invalid relative path found");
check(paths.every((filePath) => existsSync(path.join(projectRoot, filePath))), "a listed path does not exist");
check(paths.every((filePath) => !filePath.startsWith(".understand-anything/")), "scanner artifact leaked into the inventory");
check(paths.every((filePath) => !knownUntracked.has(filePath)), "one of the eight protected untracked files entered the inventory");
check(result.files.every((file) => typeof file.language === "string" && file.language.length > 0), "invalid language field found");
check(result.files.every((file) => Number.isInteger(file.sizeLines) && file.sizeLines >= 0), "invalid sizeLines found");
check(result.files.every((file) => categories.has(file.fileCategory)), "invalid fileCategory found");

const detectedLanguages = [...new Set(result.files.map((file) => file.language))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
check(stable(result.languages) === stable(detectedLanguages), "languages is not the sorted set detected from files");
check(new Set(result.frameworks).size === result.frameworks.length, "duplicate frameworks found");
const expectedComplexity = result.totalFiles <= 30 ? "small" : result.totalFiles <= 150 ? "moderate" : result.totalFiles <= 500 ? "large" : "very-large";
check(result.estimatedComplexity === expectedComplexity, "complexity does not match the file-count threshold");

const importKeys = Object.keys(result.importMap ?? {});
check(importKeys.length === paths.length, "importMap key count differs from totalFiles");
check(paths.every((filePath) => Object.hasOwn(result.importMap, filePath)), "importMap is missing a file key");
for (const file of result.files) {
  const imports = result.importMap[file.path];
  check(Array.isArray(imports), `importMap value is not an array: ${file.path}`);
  if (!Array.isArray(imports)) continue;
  check(imports.every((target) => pathSet.has(target)), `unresolved/non-project import target found: ${file.path}`);
  check(new Set(imports).size === imports.length, `duplicate import target found: ${file.path}`);
  if (file.fileCategory !== "code") check(imports.length === 0, `non-code file has imports: ${file.path}`);
}

if (failures.length) {
  for (const failure of failures) process.stderr.write(`FAIL: ${failure}\n`);
  process.exit(1);
}

const categoryBreakdown = result.files.reduce((counts, file) => {
  counts[file.fileCategory] = (counts[file.fileCategory] ?? 0) + 1;
  return counts;
}, {});
const edgeCount = Object.values(result.importMap).reduce((total, imports) => total + imports.length, 0);
process.stdout.write(`${JSON.stringify({
  valid: true,
  output: finalPath,
  name: result.name,
  totalFiles: result.totalFiles,
  categoryBreakdown,
  languages: result.languages,
  frameworks: result.frameworks,
  estimatedComplexity: result.estimatedComplexity,
  filteredByIgnore: result.filteredByIgnore,
  importMapKeys: importKeys.length,
  internalImportEdges: edgeCount,
}, null, 2)}\n`);
