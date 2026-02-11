const path = require("node:path");
const { app } = require("electron");

const repoRoot = path.resolve(__dirname, "..", "..");
const fixtureUserData =
  process.env.PRAXIS_VERIFY_FIXTURE_ROOT ||
  path.join(repoRoot, "electron", "verify", "fixtures", "ci", "praxis-desktop");
const fixtureMirrorRoot = path.join(fixtureUserData, "mirror");

process.env.PRAXIS_MIRROR_ROOT = fixtureMirrorRoot;
app.setPath("userData", fixtureUserData);
app.setName("praxis-desktop");

require(path.join(repoRoot, "dist-electron", "main.cjs"));
