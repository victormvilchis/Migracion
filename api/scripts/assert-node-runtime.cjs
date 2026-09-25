const REQUIRED_NODE_MAJOR = 22;

function parseNodeMajor(version) {
  const match = String(version || "").match(/^(\d+)\./);
  return match ? Number(match[1]) : Number.NaN;
}

function assertNodeRuntime(version = process.versions.node) {
  const major = parseNodeMajor(version);
  if (major === REQUIRED_NODE_MAJOR) return;

  throw new Error(
    `[runtime-contract] BaseBFS requires Node.js ${REQUIRED_NODE_MAJOR}.x; received ${version || "unknown"}. ` +
    `Ensure you have Node 22 active (e.g. nvm use 22.22.2).`
  );
}

if (require.main === module) {
  assertNodeRuntime();
}

module.exports = {
  REQUIRED_NODE_MAJOR,
  assertNodeRuntime,
  parseNodeMajor,
};
