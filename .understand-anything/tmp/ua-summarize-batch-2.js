import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.argv[2] ?? ".");
const input = JSON.parse(readFileSync(path.join(projectRoot, ".understand-anything/tmp/ua-file-analyzer-input-2.json"), "utf8"));

for (const file of input.batchFiles.filter((entry) => entry.path.startsWith("cypress/e2e/"))) {
  const source = readFileSync(path.join(projectRoot, file.path), "utf8");
  const title = source.match(/describe\(['"]([^'"]+)/)?.[1] ?? "";
  const tests = [...source.matchAll(/\bit\s*\(['"]([^'"]+)/g)].map((match) => match[1]);
  const routes = [...new Set([...source.matchAll(/cy\.visit\(['"]([^'"]+)/g)].map((match) => match[1]))];
  process.stdout.write(`${JSON.stringify({
    path: file.path,
    title,
    testCount: tests.length,
    firstTest: tests[0],
    lastTest: tests.at(-1),
    routes,
  })}\n`);
}
