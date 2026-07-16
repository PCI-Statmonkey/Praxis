import { spawn } from "node:child_process";
import { access, readFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const electronCmd =
  process.platform === "win32"
    ? path.join(projectRoot, "node_modules", "electron", "dist", "electron.exe")
    : path.join(projectRoot, "node_modules", ".bin", "electron");

const args = new Set(process.argv.slice(2));
const includeMemoryRepair = args.has("--repair-memory");
const includeWindowsPackage = args.has("--package-win");

const generatedTestDirs = [
  ".assistant-test-dist",
  ".sync-test-dist",
  ".home-node-networking-test-dist",
];

const commandLine = (command, commandArgs) =>
  [command, ...commandArgs].map((part) => (part.includes(" ") ? `"${part}"` : part)).join(" ");

const run = (label, command, commandArgs) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();
    console.log(`\n==> ${label}`);
    console.log(commandLine(command, commandArgs));

    const child = spawn(command, commandArgs, {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
      shell: process.platform === "win32" && command.endsWith(".cmd"),
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      if (code === 0) {
        console.log(`PASS ${label} (${elapsedSeconds}s)`);
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code ?? "unknown"}`));
    });
  });

const assertFileExists = async (label, filePath) => {
  await access(filePath);
  console.log(`PASS ${label}: ${filePath}`);
};

const checkBuilderConfigForCommittedSecrets = async () => {
  const builderConfigPath = path.join(projectRoot, "electron-builder.json5");
  const raw = await readFile(builderConfigPath, "utf8");
  const suspiciousPatterns = [
    /certificate(File|Password|SubjectName)?\s*:/i,
    /publisherName\s*:/i,
    /CSC_/,
    /token\s*:/i,
    /secret\s*:/i,
    /password\s*:/i,
  ];
  const matchedPattern = suspiciousPatterns.find((pattern) => pattern.test(raw));
  if (matchedPattern) {
    throw new Error(
      `electron-builder.json5 contains a signing/secret-looking value matching ${matchedPattern}.`
    );
  }
  console.log("PASS electron-builder config has no obvious committed signing or secret reference.");
};

const cleanupGeneratedTestDirs = async () => {
  for (const dir of generatedTestDirs) {
    await rm(path.join(projectRoot, dir), { recursive: true, force: true });
  }
};

console.log("Praxis main-PC cutover preflight");
console.log(`Project: ${projectRoot}`);
console.log(`Memory repair: ${includeMemoryRepair ? "enabled" : "skipped"}`);
console.log(`Windows package: ${includeWindowsPackage ? "enabled" : "skipped"}`);
console.log(
  "Note: encrypted OAuth/API/Slack secrets are machine-bound; expect to reconnect them on the main PC."
);

try {
  await assertFileExists("package manifest", path.join(projectRoot, "package.json"));
  await assertFileExists("Electron Builder config", path.join(projectRoot, "electron-builder.json5"));
  await assertFileExists("Electron runtime", electronCmd);
  await checkBuilderConfigForCommittedSecrets();

  await run("lint", npmCmd, ["run", "lint"]);
  await run("assistant and sync regressions", npmCmd, ["test"]);
  await run("home-node networking regressions", npmCmd, ["run", "test:home-node-networking"]);
  await run("app build", npmCmd, ["run", "build:app"]);

  if (includeMemoryRepair) {
    await run("memory repair", electronCmd, ["dist-electron/main.js", "--memory-repair"]);
  } else {
    console.log("\nSKIP memory repair");
    console.log("Run with --repair-memory when you intentionally want to rewrite memory mirrors.");
  }

  await run("storage integrity", electronCmd, ["dist-electron/main.js", "--storage-check"]);
  await run("skill registry", electronCmd, ["dist-electron/main.js", "--skills-list"]);
  await run("companion snapshot", electronCmd, ["dist-electron/main.js", "--companion-snapshot"]);
  await run("Rainmeter snapshot export", electronCmd, [
    "dist-electron/main.js",
    "--rainmeter-snapshot",
  ]);

  if (includeWindowsPackage) {
    await run("Windows x64 package", npmCmd, ["run", "package:win"]);
  } else {
    console.log("\nSKIP Windows x64 package");
    console.log("Run with --package-win when you want installer artifacts for a smoke test.");
  }

  await cleanupGeneratedTestDirs();

  console.log("\nMain-PC cutover preflight passed.");
  console.log("Before moving active operation:");
  console.log("- Commit and push any source changes you want on the main PC.");
  console.log("- Back up %APPDATA%\\praxis-desktop and the markdown memory root.");
  console.log("- Reconnect OAuth/API/Slack credentials on the main PC through Settings or env setup.");
  console.log("- Run this preflight again on the main PC after npm install/repair:native.");
} catch (error) {
  await cleanupGeneratedTestDirs();
  console.error("\nMain-PC cutover preflight failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
