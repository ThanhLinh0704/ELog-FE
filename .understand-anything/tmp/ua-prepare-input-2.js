import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [projectRootArg, planArg, outputArg] = process.argv.slice(2);
if (!projectRootArg || !planArg || !outputArg) {
  process.stderr.write("Expected project root, batch plan, and output path\n");
  process.exit(1);
}

const projectRoot = path.resolve(projectRootArg);
const plan = JSON.parse(readFileSync(path.resolve(planArg), "utf8"));
const batch = plan.batches?.[1];
if (!batch || batch.index !== 2 || !Array.isArray(batch.files) || !batch.importData) {
  process.stderr.write("batches[1] is not a valid batch 2 definition\n");
  process.exit(1);
}

const input = {
  projectRoot,
  batchFiles: batch.files,
  batchImportData: batch.importData,
};
writeFileSync(path.resolve(outputArg), `${JSON.stringify(input, null, 2)}\n`, "utf8");

const importEdges = Object.values(batch.importData).reduce((total, imports) => total + imports.length, 0);
process.stdout.write(`${JSON.stringify({ index: batch.index, files: batch.files.length, importEdges })}\n`);
