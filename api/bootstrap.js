const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { globSync } = require("glob");
const { assertNodeRuntime } = require("./scripts/assert-node-runtime.cjs");

const projectRoot = __dirname;

assertNodeRuntime();

function resolveEntryFiles() {
  return globSync("dist/functions/*.js", {
    cwd: projectRoot,
    nodir: true,
  }).sort();
}

function runBuild() {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["run", "build"], {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Build command failed with exit code ${result.status}.`);
  }
}

let entryFiles = resolveEntryFiles();

if (entryFiles.length === 0) {
  console.warn(
    `[functions-bootstrap] No files found in "dist/functions/*.js". Executing build...`
  );
  runBuild();
  entryFiles = resolveEntryFiles();
}

if (entryFiles.length === 0) {
  throw new Error(
    `[functions-bootstrap] Unable to find compiled functions in "dist/functions/*.js" after build.`
  );
}

for (const file of entryFiles) {
  require(path.join(projectRoot, file));
}
