#!/usr/bin/env node
/**
 * Removes `.next` so the dev server cannot get stuck with a half-written webpack
 * runtime after a failed compile (e.g. syntax errors). Run before `next dev` when
 * you see MODULE_NOT_FOUND for paths under `.next/server/chunks/`.
 */
const fs = require("fs");
const path = require("path");

function cleanNextCache({ silent = false } = {}) {
  const nextDir = path.join(__dirname, "..", ".next");
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    if (!silent) {
      console.log("Removed .next (Next.js will rebuild on next dev start).");
    }
    return true;
  }
  if (!silent) {
    console.log(".next not found; nothing to clear.");
  }
  return false;
}

module.exports = { cleanNextCache };

if (require.main === module) {
  cleanNextCache();
}
