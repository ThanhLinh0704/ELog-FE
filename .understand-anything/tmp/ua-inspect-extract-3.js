import { readFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.argv[2] ?? ".");
const extracted = JSON.parse(readFileSync(path.join(projectRoot, ".understand-anything/tmp/ua-file-extract-results-3.json"), "utf8"));
const start = Number.parseInt(process.argv[3] ?? "0", 10);
const end = Number.parseInt(process.argv[4] ?? String(extracted.results.length), 10);

process.stdout.write(`${JSON.stringify({
  scriptCompleted: extracted.scriptCompleted,
  filesAnalyzed: extracted.filesAnalyzed,
  filesSkipped: extracted.filesSkipped,
  results: extracted.results.slice(start, end).map((result) => {
    const exportedNames = new Set((result.exports ?? []).map((entry) => entry.name));
    const functions = (result.functions ?? []).map((fn) => ({
      ...fn,
      significant: fn.endLine - fn.startLine + 1 >= 10 || exportedNames.has(fn.name),
      exported: exportedNames.has(fn.name),
    }));
    const classes = (result.classes ?? []).map((cls) => ({
      ...cls,
      significant: cls.endLine - cls.startLine + 1 >= 20 || (cls.methods?.length ?? 0) >= 2 || exportedNames.has(cls.name),
      exported: exportedNames.has(cls.name),
    }));
    const callers = Object.create(null);
    for (const call of result.callGraph ?? []) {
      callers[call.caller] ??= [];
      if (!callers[call.caller].includes(call.callee)) callers[call.caller].push(call.callee);
    }
    return {
      path: result.path,
      totalLines: result.totalLines,
      nonEmptyLines: result.nonEmptyLines,
      metrics: result.metrics,
      exports: result.exports ?? [],
      functions,
      classes,
      callers,
    };
  }),
}, null, 2)}\n`);
