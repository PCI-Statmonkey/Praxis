import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, ".home-node-networking-test-dist");
const testFiles = [
  "home-node-networking-closeout.test.ts",
  "home-node-local-pairing-lifecycle.test.ts",
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
