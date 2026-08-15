import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.argv[2] ?? ".");
const readJson = (relativePath) => JSON.parse(readFileSync(path.join(projectRoot, relativePath), "utf8"));
const plan = readJson(".understand-anything/intermediate/batch-plan.json");
const input = readJson(".understand-anything/tmp/ua-file-analyzer-input-3.json");
const extracted = readJson(".understand-anything/tmp/ua-file-extract-results-3.json");
const scan = readJson(".understand-anything/intermediate/scan-result.json");
const output = readJson(".understand-anything/intermediate/batch-3.json");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const stable = (value) => JSON.stringify(value);

const authoritative = plan.batches[2];
check(authoritative.index === 3, "batches[2] is not batch 3");
check(stable(input.batchFiles) === stable(authoritative.files), "batchFiles is not a verbatim copy of batches[2].files");
check(stable(input.batchImportData) === stable(authoritative.importData), "batchImportData is not a verbatim copy of batches[2].importData");
check(extracted.scriptCompleted === true, "bundled extractor did not complete");
check(extracted.filesAnalyzed === 25 && extracted.results.length === 25, "extractor did not analyze all 25 files");
check(Array.isArray(extracted.filesSkipped) && extracted.filesSkipped.length === 0, "one or more files were skipped");
check(Array.isArray(output.nodes) && Array.isArray(output.edges) && Object.keys(output).length === 2, "invalid top-level output schema");

const filePrefix = (category) => category === "docs" ? "document" : category === "config" ? "config" : "file";
const batchByPath = new Map(authoritative.files.map((file) => [file.path, file]));
const extractByPath = new Map(extracted.results.map((file) => [file.path, file]));
const knownProjectIds = new Set(scan.files.map((file) => `${filePrefix(file.fileCategory)}:${file.path}`));
const expectedFileIds = new Set(authoritative.files.map((file) => `${filePrefix(file.fileCategory)}:${file.path}`));
const allowedNodeTypes = new Set(["file", "function", "class", "config", "document", "service", "table", "endpoint", "pipeline", "schema", "resource"]);
const nodeIds = new Set();

for (const node of output.nodes) {
  check(typeof node.id === "string" && node.id.length > 0, "invalid node id");
  check(!nodeIds.has(node.id), `duplicate node id: ${node.id}`);
  nodeIds.add(node.id);
  check(allowedNodeTypes.has(node.type), `invalid node type: ${node.id}`);
  check(typeof node.name === "string" && node.name.length > 0, `invalid node name: ${node.id}`);
  check(typeof node.summary === "string" && node.summary.trim().length > 0, `empty summary: ${node.id}`);
  check(!node.summary.includes("Thực hiện xử lý "), `generic fallback summary remains: ${node.id}`);
  check(Array.isArray(node.tags) && node.tags.length >= 3 && node.tags.length <= 5, `tags count outside 3-5: ${node.id}`);
  check(node.tags?.every((tag) => typeof tag === "string" && tag === tag.toLowerCase() && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag)), `invalid tag slug: ${node.id}`);
  check(["simple", "moderate", "complex"].includes(node.complexity), `invalid complexity: ${node.id}`);
  if (Object.hasOwn(node, "languageNotes")) check(typeof node.languageNotes === "string" && node.languageNotes.trim(), `invalid languageNotes: ${node.id}`);
  check(typeof node.filePath === "string" && existsSync(path.join(projectRoot, node.filePath)), `filePath does not exist: ${node.id}`);
}

const fileNodes = output.nodes.filter((node) => node.type === "file");
check(fileNodes.length === authoritative.files.length, "file node count differs from batch size");
for (const node of fileNodes) {
  const batchFile = batchByPath.get(node.filePath);
  check(Boolean(batchFile), `file node outside authoritative batch: ${node.id}`);
  if (!batchFile) continue;
  check(node.id === `file:${node.filePath}`, `invalid file node id: ${node.id}`);
  check(node.name === path.posix.basename(node.filePath), `file node name mismatch: ${node.id}`);
  const result = extractByPath.get(node.filePath);
  const expectedComplexity = result.nonEmptyLines < 50 ? "simple" : result.nonEmptyLines <= 200 ? "moderate" : "complex";
  check(node.complexity === expectedComplexity, `file complexity mismatch: ${node.id}`);
}
check([...expectedFileIds].every((id) => nodeIds.has(id)), "one or more required file nodes are missing");

const expectedSymbols = new Map();
for (const result of extracted.results) {
  const exported = new Set((result.exports ?? []).map((entry) => entry.name));
  for (const fn of result.functions ?? []) {
    if (fn.endLine - fn.startLine + 1 >= 10 || exported.has(fn.name)) {
      expectedSymbols.set(`function:${result.path}:${fn.name}`, { type: "function", filePath: result.path, value: fn, exported: exported.has(fn.name) });
    }
  }
  for (const cls of result.classes ?? []) {
    if (cls.endLine - cls.startLine + 1 >= 20 || cls.methods.length >= 2 || exported.has(cls.name)) {
      expectedSymbols.set(`class:${result.path}:${cls.name}`, { type: "class", filePath: result.path, value: cls, exported: exported.has(cls.name) });
    }
  }
}

const semanticNodes = output.nodes.filter((node) => node.type === "function" || node.type === "class");
check(expectedSymbols.size === 89, `unexpected authoritative significant symbol count: ${expectedSymbols.size}`);
check(semanticNodes.length === expectedSymbols.size, "semantic node count differs from significance filter");
for (const node of semanticNodes) {
  const expected = expectedSymbols.get(node.id);
  check(Boolean(expected), `unexpected semantic node: ${node.id}`);
  if (!expected) continue;
  check(node.type === expected.type, `semantic type mismatch: ${node.id}`);
  check(node.name === expected.value.name, `semantic name mismatch: ${node.id}`);
  check(node.filePath === expected.filePath, `semantic filePath mismatch: ${node.id}`);
  check(stable(node.lineRange) === stable([expected.value.startLine, expected.value.endLine]), `lineRange mismatch: ${node.id}`);
  const lineCount = expected.value.endLine - expected.value.startLine + 1;
  const expectedComplexity = lineCount < 50 ? "simple" : lineCount <= 200 ? "moderate" : "complex";
  check(node.complexity === expectedComplexity, `semantic complexity mismatch: ${node.id}`);
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
  check(nodeIds.has(edge.source) || knownProjectIds.has(edge.source), `unknown edge source: ${edge.source}`);
  check(nodeIds.has(edge.target) || knownProjectIds.has(edge.target), `unknown edge target: ${edge.target}`);
  check(edgeWeights.has(edge.type), `invalid edge type: ${edge.type}`);
  check(edge.direction === "forward", `non-forward edge: ${edge.source} -> ${edge.target}`);
  check(edge.weight === edgeWeights.get(edge.type), `incorrect edge weight: ${edge.source} -> ${edge.target}`);
  check(edge.source !== edge.target, `self edge: ${edge.source}`);
  const key = `${edge.source}|${edge.target}|${edge.type}`;
  check(!edgeKeys.has(key), `duplicate edge: ${key}`);
  edgeKeys.add(key);
}

const expectedImportKeys = [];
for (const file of authoritative.files) {
  for (const target of authoritative.importData[file.path] ?? []) expectedImportKeys.push(`file:${file.path}|file:${target}|imports`);
}
const actualImportKeys = output.edges.filter((edge) => edge.type === "imports").map((edge) => `${edge.source}|${edge.target}|imports`);
check(expectedImportKeys.length === 76, `authoritative import count is ${expectedImportKeys.length}, not 76`);
check(stable([...actualImportKeys].sort()) === stable([...expectedImportKeys].sort()), "import edges are not an exact 1:1 emission of batchImportData");

let expectedExportCount = 0;
for (const [id, expected] of expectedSymbols) {
  const fileId = `file:${expected.filePath}`;
  check(output.edges.some((edge) => edge.source === fileId && edge.target === id && edge.type === "contains" && edge.weight === 1.0), `missing contains edge: ${id}`);
  const exportEdges = output.edges.filter((edge) => edge.source === fileId && edge.target === id && edge.type === "exports");
  if (expected.exported) {
    expectedExportCount += 1;
    check(exportEdges.length === 1 && exportEdges[0].weight === 0.8, `missing or invalid exports edge: ${id}`);
  } else {
    check(exportEdges.length === 0, `non-exported symbol has exports edge: ${id}`);
  }
}
check(expectedExportCount === 49, `unexpected exported significant symbol count: ${expectedExportCount}`);
check(output.edges.filter((edge) => edge.type === "contains").length === 89, "contains edge count must equal significant symbols");
check(output.edges.filter((edge) => edge.type === "exports").length === 49, "exports edge count mismatch");
check(output.edges.length === 76 + 89 + 49, "unexpected extra or missing edges");

const regenerateNode = output.nodes.find((node) => node.id === "function:src/api/loadingManifestApi.ts:regenerateLoadingManifest");
const confirmNode = output.nodes.find((node) => node.id === "function:src/api/loadingManifestApi.ts:confirmLoadingManifest");
check(regenerateNode?.summary.includes("chưa được định nghĩa"), "regenerateLoadingManifest warning is not reflected in summary");
check(confirmNode?.summary.includes("chưa được định nghĩa"), "confirmLoadingManifest warning is not reflected in summary");

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
  importEdgesExpected: expectedImportKeys.length,
  importEdgesActual: actualImportKeys.length,
  filesSkipped: extracted.filesSkipped,
  warnings: ["regenerateLoadingManifest và confirmLoadingManifest chưa có endpoint trong API contract và hiện chủ động ném lỗi."],
}, null, 2)}\n`);
