import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [inputArg, outputArg, projectRootArg, description] = process.argv.slice(2);

function fail(message) {
  process.stderr.write(`Fatal assembly error: ${message}\n`);
  process.exit(1);
}

if (!inputArg || !outputArg || !projectRootArg || !description) {
  fail("Expected input, output, project root, and description arguments");
}

const inputPath = path.resolve(inputArg);
const outputPath = path.resolve(outputArg);
const projectRoot = path.resolve(projectRootArg);
let scan;
try {
  scan = JSON.parse(readFileSync(inputPath, "utf8"));
} catch (error) {
  fail(`Cannot read scan result: ${error.message}`);
}

if (scan.scriptCompleted !== true) fail("Discovery script did not report successful completion");
if (!Array.isArray(scan.files) || scan.totalFiles !== scan.files.length) {
  fail("totalFiles does not match files.length");
}
const allowedCategories = new Set(["code", "config", "docs", "infra", "data", "script", "markup"]);
const paths = scan.files.map((file) => file.path);
if (new Set(paths).size !== paths.length) fail("Duplicate file paths detected");
if (paths.some((filePath) => !existsSync(path.join(projectRoot, filePath)))) {
  fail("At least one discovered path no longer exists on disk");
}
if (scan.files.some((file) => !allowedCategories.has(file.fileCategory))) {
  fail("Invalid fileCategory detected");
}
const sortedPaths = [...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
if (paths.some((filePath, index) => filePath !== sortedPaths[index])) {
  fail("Files are not sorted alphabetically by path");
}
const importKeys = Object.keys(scan.importMap ?? {});
if (importKeys.length !== paths.length || paths.some((filePath) => !Object.hasOwn(scan.importMap, filePath))) {
  fail("importMap does not contain exactly one key for every discovered file");
}
for (const [source, imports] of Object.entries(scan.importMap)) {
  if (!Array.isArray(imports) || imports.some((target) => !paths.includes(target))) {
    fail(`Invalid internal import list for ${source}`);
  }
}

const finalResult = {
  name: scan.name,
  description,
  languages: scan.languages,
  frameworks: scan.frameworks,
  files: scan.files,
  totalFiles: scan.totalFiles,
  filteredByIgnore: scan.filteredByIgnore,
  estimatedComplexity: scan.estimatedComplexity,
  importMap: scan.importMap,
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(finalResult, null, 2)}\n`, "utf8");
