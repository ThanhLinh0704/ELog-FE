import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.argv[2] ?? ".");
const readJson = (relativePath) => JSON.parse(readFileSync(path.join(projectRoot, relativePath), "utf8"));
const plan = readJson(".understand-anything/intermediate/batch-plan.json");
const input = readJson(".understand-anything/tmp/ua-file-analyzer-input-2.json");
const extracted = readJson(".understand-anything/tmp/ua-file-extract-results-2.json");
const scan = readJson(".understand-anything/intermediate/scan-result.json");
const output = readJson(".understand-anything/intermediate/batch-2.json");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const stable = (value) => JSON.stringify(value);

const authoritative = plan.batches[1];
check(authoritative.index === 2, "batches[1] is not batch 2");
check(stable(input.batchFiles) === stable(authoritative.files), "batchFiles is not a verbatim copy of plan batches[1].files");
check(stable(input.batchImportData) === stable(authoritative.importData), "batchImportData is not a verbatim copy of plan batches[1].importData");
check(extracted.scriptCompleted === true, "bundled extractor did not complete");
check(extracted.filesAnalyzed === authoritative.files.length, "filesAnalyzed differs from authoritative batch size");
check(Array.isArray(extracted.filesSkipped) && extracted.filesSkipped.length === 0, "one or more files were skipped");
check(extracted.results.length === authoritative.files.length, "extractor results differ from authoritative batch size");
check(Array.isArray(output.nodes) && Array.isArray(output.edges) && Object.keys(output).length === 2, "invalid top-level output schema");

const filePrefix = (category) => category === "docs" ? "document" : category === "config" ? "config" : "file";
const batchByPath = new Map(authoritative.files.map((file) => [file.path, file]));
const extractedByPath = new Map(extracted.results.map((file) => [file.path, file]));
const knownProjectNodeIds = new Set(scan.files.map((file) => `${filePrefix(file.fileCategory)}:${file.path}`));
const expectedFileIds = new Set(authoritative.files.map((file) => `${filePrefix(file.fileCategory)}:${file.path}`));
const allowedNodeTypes = new Set(["file", "function", "class", "config", "document", "service", "table", "endpoint", "pipeline", "schema", "resource"]);
const nodeIds = new Set();

for (const node of output.nodes) {
  check(typeof node.id === "string" && node.id.length > 0, "node has invalid id");
  check(!nodeIds.has(node.id), `duplicate node id: ${node.id}`);
  nodeIds.add(node.id);
  check(allowedNodeTypes.has(node.type), `invalid node type: ${node.id}`);
  check(typeof node.name === "string" && node.name.length > 0, `invalid node name: ${node.id}`);
  check(typeof node.summary === "string" && node.summary.trim().length > 0, `empty summary: ${node.id}`);
  check(Array.isArray(node.tags) && node.tags.length >= 3 && node.tags.length <= 5, `tags count outside 3-5: ${node.id}`);
  check(node.tags?.every((tag) => typeof tag === "string" && tag === tag.toLowerCase() && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag)), `invalid tag slug: ${node.id}`);
  check(["simple", "moderate", "complex"].includes(node.complexity), `invalid complexity: ${node.id}`);
  if (Object.hasOwn(node, "languageNotes")) check(typeof node.languageNotes === "string" && node.languageNotes.trim(), `invalid languageNotes: ${node.id}`);
  check(typeof node.filePath === "string" && existsSync(path.join(projectRoot, node.filePath)), `node filePath does not exist: ${node.id}`);
}

const actualFileNodes = output.nodes.filter((node) => ["file", "config", "document", "service", "pipeline", "schema", "resource"].includes(node.type));
check(actualFileNodes.length === authoritative.files.length, "output does not contain exactly one file-level node per batch file");
for (const node of actualFileNodes) {
  const batchFile = batchByPath.get(node.filePath);
  check(Boolean(batchFile), `file-level node is outside batch: ${node.id}`);
  if (!batchFile) continue;
  const expectedType = filePrefix(batchFile.fileCategory);
  check(node.type === expectedType, `file node type mismatch: ${node.id}`);
  check(node.id === `${expectedType}:${node.filePath}`, `file node id prefix mismatch: ${node.id}`);
  check(node.name === path.posix.basename(node.filePath), `file node name mismatch: ${node.id}`);
  const result = extractedByPath.get(node.filePath);
  const expectedComplexity = result.nonEmptyLines < 50 ? "simple" : result.nonEmptyLines <= 200 ? "moderate" : "complex";
  check(node.complexity === expectedComplexity, `file complexity contradicts extraction metrics: ${node.id}`);
}
check([...expectedFileIds].every((id) => nodeIds.has(id)), "one or more required file nodes are missing");

const expectedSymbols = new Map();
for (const result of extracted.results) {
  const exportedNames = new Set((result.exports ?? []).map((entry) => entry.name));
  for (const fn of result.functions ?? []) {
    const significant = fn.endLine - fn.startLine + 1 >= 10 || exportedNames.has(fn.name);
    if (significant) expectedSymbols.set(`function:${result.path}:${fn.name}`, { ...fn, type: "function", exported: exportedNames.has(fn.name) });
  }
  for (const cls of result.classes ?? []) {
    const significant = cls.methods.length >= 2 || cls.endLine - cls.startLine + 1 >= 20 || exportedNames.has(cls.name);
    if (significant) expectedSymbols.set(`class:${result.path}:${cls.name}`, { ...cls, type: "class", exported: exportedNames.has(cls.name) });
  }
}
const actualSymbols = output.nodes.filter((node) => node.type === "function" || node.type === "class");
check(actualSymbols.length === expectedSymbols.size, "semantic node count differs from significance filter");
for (const node of actualSymbols) {
  const expected = expectedSymbols.get(node.id);
  check(Boolean(expected), `unexpected semantic node: ${node.id}`);
  if (!expected) continue;
  check(node.type === expected.type, `semantic node type mismatch: ${node.id}`);
  check(node.name === expected.name, `semantic node name mismatch: ${node.id}`);
  check(stable(node.lineRange) === stable([expected.startLine, expected.endLine]), `lineRange mismatch: ${node.id}`);
  check(batchByPath.has(node.filePath), `semantic node filePath outside batch: ${node.id}`);
}
check([...expectedSymbols.keys()].every((id) => nodeIds.has(id)), "one or more significant symbols are missing");

const edgeWeights = new Map([
  ["contains", 1.0], ["imports", 0.7], ["calls", 0.8], ["inherits", 0.9], ["implements", 0.9],
  ["exports", 0.8], ["depends_on", 0.6], ["tested_by", 0.5], ["configures", 0.6], ["documents", 0.5],
  ["deploys", 0.7], ["migrates", 0.7], ["triggers", 0.6], ["defines_schema", 0.8], ["serves", 0.7],
  ["provisions", 0.7], ["routes", 0.6], ["related", 0.5],
]);
const edgeKeys = new Set();
for (const edge of output.edges) {
  check(nodeIds.has(edge.source) || knownProjectNodeIds.has(edge.source), `unknown edge source: ${edge.source}`);
  check(nodeIds.has(edge.target) || knownProjectNodeIds.has(edge.target), `unknown edge target: ${edge.target}`);
  check(edgeWeights.has(edge.type), `invalid edge type: ${edge.type}`);
  check(edge.direction === "forward", `non-forward edge: ${edge.source} -> ${edge.target}`);
  check(edge.weight === edgeWeights.get(edge.type), `incorrect edge weight: ${edge.source} -> ${edge.target}`);
  check(edge.source !== edge.target, `self edge: ${edge.source}`);
  const key = `${edge.source}|${edge.target}|${edge.type}`;
  check(!edgeKeys.has(key), `duplicate edge: ${key}`);
  edgeKeys.add(key);
}

for (const [symbolId, symbol] of expectedSymbols) {
  const fileId = `file:${symbolId.split(":").slice(1, -1).join(":")}`;
  check(output.edges.some((edge) => edge.source === fileId && edge.target === symbolId && edge.type === "contains" && edge.weight === 1.0), `missing contains edge: ${symbolId}`);
  if (symbol.exported) {
    check(output.edges.some((edge) => edge.source === fileId && edge.target === symbolId && edge.type === "exports" && edge.weight === 0.8), `missing exports edge: ${symbolId}`);
  }
}

const expectedImportEdges = [];
for (const file of authoritative.files.filter((entry) => entry.fileCategory === "code")) {
  for (const target of authoritative.importData[file.path] ?? []) {
    expectedImportEdges.push(`file:${file.path}|file:${target}|imports`);
  }
}
const actualImportEdges = output.edges
  .filter((edge) => edge.type === "imports")
  .map((edge) => `${edge.source}|${edge.target}|${edge.type}`);
check(expectedImportEdges.length === 9, "authoritative import edge count is not 9");
check(stable([...actualImportEdges].sort()) === stable([...expectedImportEdges].sort()), "imports edges are not an exact 1:1 emission of batchImportData");
check(output.edges.filter((edge) => edge.type === "tested_by").length === 0, "placeholder Cypress specs must not claim tested_by relationships");

if (failures.length) {
  for (const failure of failures) process.stderr.write(`FAIL: ${failure}\n`);
  process.exit(1);
}

const nodesByType = output.nodes.reduce((counts, node) => {
  counts[node.type] = (counts[node.type] ?? 0) + 1;
  return counts;
}, {});
const edgesByType = output.edges.reduce((counts, edge) => {
  counts[edge.type] = (counts[edge.type] ?? 0) + 1;
  return counts;
}, {});
process.stdout.write(`${JSON.stringify({
  valid: true,
  nodes: output.nodes.length,
  nodesByType,
  edges: output.edges.length,
  edgesByType,
  importEdgesExpected: expectedImportEdges.length,
  importEdgesActual: actualImportEdges.length,
  filesSkipped: extracted.filesSkipped,
  warnings: ["16 Cypress flow specs hiện là placeholder; cy.visit đang bị comment và assertion chỉ kiểm tra hằng true."],
}, null, 2)}\n`);
