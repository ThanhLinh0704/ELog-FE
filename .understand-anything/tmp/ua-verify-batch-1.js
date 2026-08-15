import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.argv[2] ?? ".");
const readJson = (relativePath) => JSON.parse(readFileSync(path.join(projectRoot, relativePath), "utf8"));
const input = readJson(".understand-anything/tmp/ua-file-analyzer-input-1.json");
const extracted = readJson(".understand-anything/tmp/ua-file-extract-results-1.json");
const scan = readJson(".understand-anything/intermediate/scan-result.json");
const outputPath = path.join(projectRoot, ".understand-anything/intermediate/batch-1.json");
const outputText = readFileSync(outputPath, "utf8");
const output = JSON.parse(outputText);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const allowedNodeTypes = new Set(["file", "function", "class", "config", "document", "service", "table", "endpoint", "pipeline", "schema", "resource"]);
const edgeWeights = new Map([
  ["contains", 1.0], ["imports", 0.7], ["calls", 0.8], ["inherits", 0.9],
  ["implements", 0.9], ["exports", 0.8], ["depends_on", 0.6], ["tested_by", 0.5],
  ["configures", 0.6], ["documents", 0.5], ["deploys", 0.7], ["migrates", 0.7],
  ["triggers", 0.6], ["defines_schema", 0.8], ["serves", 0.7], ["provisions", 0.7],
  ["routes", 0.6], ["related", 0.5],
]);
const fileNodePrefix = (category) => category === "docs" ? "document" : category === "config" ? "config" : "file";
const batchByPath = new Map(input.batchFiles.map((file) => [file.path, file]));
const extractByPath = new Map(extracted.results.map((file) => [file.path, file]));
const scanByPath = new Map(scan.files.map((file) => [file.path, file]));
const expectedFileNodeIds = new Set(input.batchFiles.map((file) => `${fileNodePrefix(file.fileCategory)}:${file.path}`));
const knownProjectNodeIds = new Set(scan.files.map((file) => `${fileNodePrefix(file.fileCategory)}:${file.path}`));

check(extracted.scriptCompleted === true, "bundled extractor did not complete");
check(extracted.filesAnalyzed === input.batchFiles.length, "filesAnalyzed differs from batch size");
check(Array.isArray(extracted.filesSkipped) && extracted.filesSkipped.length === 0, "one or more files were skipped");
check(extracted.results.length === input.batchFiles.length, "extractor result count differs from batch size");
check(Object.keys(output).length === 2 && Array.isArray(output.nodes) && Array.isArray(output.edges), "top-level schema must contain only nodes and edges arrays");
check(output.nodes.length === input.batchFiles.length, "batch does not contain exactly one node per non-code file");

const nodeIds = new Set();
for (const node of output.nodes) {
  check(typeof node.id === "string" && node.id.length > 0, "node has invalid id");
  check(!nodeIds.has(node.id), `duplicate node id: ${node.id}`);
  nodeIds.add(node.id);
  check(allowedNodeTypes.has(node.type), `invalid node type: ${node.id}`);
  check(typeof node.name === "string" && node.name.length > 0, `invalid node name: ${node.id}`);
  check(typeof node.summary === "string" && node.summary.trim().length > 0, `empty summary: ${node.id}`);
  check(Array.isArray(node.tags) && node.tags.length >= 3 && node.tags.length <= 5, `tags count outside 3-5: ${node.id}`);
  check(node.tags?.every((tag) => typeof tag === "string" && tag === tag.toLowerCase() && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag)), `tags are not lowercase hyphenated slugs: ${node.id}`);
  check(["simple", "moderate", "complex"].includes(node.complexity), `invalid complexity: ${node.id}`);
  if (Object.hasOwn(node, "languageNotes")) check(typeof node.languageNotes === "string" && node.languageNotes.trim(), `invalid languageNotes: ${node.id}`);

  check(typeof node.filePath === "string" && batchByPath.has(node.filePath), `filePath is absent from batch: ${node.id}`);
  if (!batchByPath.has(node.filePath)) continue;
  const batchFile = batchByPath.get(node.filePath);
  const expectedType = fileNodePrefix(batchFile.fileCategory);
  check(node.type === expectedType, `node type does not match category: ${node.id}`);
  check(node.id === `${expectedType}:${node.filePath}`, `node id does not match prefix convention: ${node.id}`);
  check(node.name === path.posix.basename(node.filePath), `node name differs from filename: ${node.id}`);
  check(existsSync(path.join(projectRoot, node.filePath)), `node file does not exist: ${node.filePath}`);
  const extraction = extractByPath.get(node.filePath);
  check(Boolean(extraction), `missing extraction result: ${node.filePath}`);
  if (extraction) {
    const expectedComplexity = extraction.nonEmptyLines < 50 ? "simple" : extraction.nonEmptyLines <= 200 ? "moderate" : "complex";
    check(node.complexity === expectedComplexity, `complexity contradicts extracted metrics: ${node.id}`);
  }
}
check([...expectedFileNodeIds].every((id) => nodeIds.has(id)), "one or more required batch file nodes are missing");
check(output.nodes.every((node) => !["module", "concept", "domain", "flow", "step"].includes(node.type)), "reserved node type emitted");

const edgeKeys = new Set();
for (const edge of output.edges) {
  check(typeof edge.source === "string" && nodeIds.has(edge.source), `edge source is not a current-batch node: ${edge.source}`);
  check(typeof edge.target === "string" && (nodeIds.has(edge.target) || knownProjectNodeIds.has(edge.target)), `edge target is not a known project node: ${edge.target}`);
  check(edgeWeights.has(edge.type), `invalid edge type: ${edge.type}`);
  check(edge.direction === "forward", `edge direction is not forward: ${edge.source}`);
  check(edge.weight === edgeWeights.get(edge.type), `incorrect edge weight: ${edge.source} -> ${edge.target}`);
  check(edge.source !== edge.target, `self-referencing edge: ${edge.source}`);
  const edgeKey = `${edge.source}|${edge.target}|${edge.type}`;
  check(!edgeKeys.has(edgeKey), `duplicate edge: ${edgeKey}`);
  edgeKeys.add(edgeKey);
}

const expectedImportEdges = input.batchFiles
  .filter((file) => file.fileCategory === "code")
  .reduce((count, file) => count + (input.batchImportData[file.path]?.length ?? 0), 0);
const actualImportEdges = output.edges.filter((edge) => edge.type === "imports").length;
check(actualImportEdges === expectedImportEdges, "import edge count differs from batchImportData");
check(!outputText.includes("VITE_API_BASE_URL") && !outputText.includes("VITE_USE_MOCK"), "environment variable identifiers leaked into output");
const envNode = output.nodes.find((node) => node.id === "config:.env.development");
check(Boolean(envNode), "environment config node missing");
if (envNode) {
  const serializedEnvNode = JSON.stringify(envNode).toLowerCase();
  check(!serializedEnvNode.includes("localhost") && !serializedEnvNode.includes("http://") && !serializedEnvNode.includes("https://") && !serializedEnvNode.includes("=true") && !serializedEnvNode.includes("=false"), "possible environment value leaked into env node");
}

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
  importEdgesExpected: expectedImportEdges,
  importEdgesActual: actualImportEdges,
  filesSkipped: extracted.filesSkipped,
  warnings: [],
}, null, 2)}\n`);
