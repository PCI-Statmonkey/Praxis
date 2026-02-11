const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const fixtureUserData =
  process.env.PRAXIS_VERIFY_FIXTURE_ROOT ||
  path.join(repoRoot, "electron", "verify", "fixtures", "ci", "praxis-desktop");
const fixtureMirrorRoot = path.join(fixtureUserData, "mirror");

const env = { ...process.env, PRAXIS_MIRROR_ROOT: fixtureMirrorRoot };
delete env.ELECTRON_RUN_AS_NODE;

const npmExecPath = process.env.npm_execpath;
const command = npmExecPath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const args = npmExecPath
  ? [
      npmExecPath,
      "exec",
      "--",
      "electron",
      path.join(repoRoot, "electron", "verify", "bootstrapVerifySafety.cjs"),
      "--verify",
      "--json",
    ]
  : [
      "exec",
      "--",
      "electron",
      path.join(repoRoot, "electron", "verify", "bootstrapVerifySafety.cjs"),
      "--verify",
      "--json",
    ];

const result = spawnSync(command, args, {
  cwd: repoRoot,
  env,
  stdio: "inherit",
  shell: !npmExecPath && process.platform === "win32",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
