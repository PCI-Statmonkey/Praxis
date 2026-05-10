import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, ".assistant-test-dist");
const testFiles = [
  "assistant-regression.test.ts",
  "calendar-writeback.test.ts",
  "daily-brief-builder.test.ts",
  "focus-report-follow-up.test.ts",
  "person-lookup-engine.test.ts",
  "project-template-proposals.test.ts",
  "review-inbox.test.ts",
  "work-lookup-actions.test.ts",
  "waiting-on-assignment.test.ts",
];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const result = await build({
  entryPoints: testFiles.map((file) => path.join(projectRoot, "tests", file)),
  outdir: outDir,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  sourcemap: "inline",
  logLevel: "silent",
  metafile: true,
});

for (const outputPath of Object.keys(result.metafile.outputs).filter((candidate) =>
  candidate.endsWith(".js")
)) {
  await import(pathToFileURL(path.resolve(outputPath)).href);
}
