#!/usr/bin/env node
/**
 * Runs `next dev` and, when Next/webpack leaves `.next` inconsistent (typical sign:
 * Cannot find module './chunks/...' or './<id>.js' from webpack-runtime), clears `.next` and
 * restarts the dev server automatically.
 *
 * Escape hatch: SKIP_NEXT_DEV_AUTO_CLEAN=1 npm run dev → plain `next dev` (no watcher).
 */
const { spawn } = require("child_process");
const path = require("path");
const { cleanNextCache } = require("./clean-next-cache");

const projectRoot = path.join(__dirname, "..");
const nextBin = require.resolve("next/dist/bin/next");
const extraArgs = process.argv.slice(2);

/** Stale server bundle: webpack-runtime requires a sibling chunk that is missing from `.next`. */
const CORRUPT_CHUNK_RE = /Cannot find module ['"]\.\/(?:chunks\/|\d+\.js)/;

const MAX_RECOVERIES = 5;
const WINDOW_MS = 180_000;
const recoveryTimestamps = [];

let child = null;
let scanBuf = "";
let recoveryPending = false;
let isRestarting = false;
let stopping = false;

function recordRecoveryAttempt() {
  const now = Date.now();
  recoveryTimestamps.push(now);
  while (recoveryTimestamps.length && now - recoveryTimestamps[0] > WINDOW_MS) {
    recoveryTimestamps.shift();
  }
  if (recoveryTimestamps.length > MAX_RECOVERIES) {
    console.error(
      "\n[next-dev-auto-clean] Too many automatic recoveries in a short window.",
      "There may be a real project error. Fix it or run: npm run dev:clean\n"
    );
    stopping = true;
    return false;
  }
  return true;
}

function killChild() {
  return new Promise(resolve => {
    if (!child) {
      resolve();
      return;
    }
    const c = child;
    const done = () => {
      clearTimeout(forceKill);
      resolve();
    };
    c.once("exit", done);
    c.kill("SIGTERM");
    const forceKill = setTimeout(() => {
      try {
        if (!c.killed) c.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, 4000);
  });
}

async function recoverFromCorruptCache() {
  if (stopping || recoveryPending) return;
  recoveryPending = true;
  try {
    if (!recordRecoveryAttempt()) {
      isRestarting = true;
      try {
        await killChild();
      } finally {
        isRestarting = false;
      }
      child = null;
      process.exit(1);
      return;
    }
    console.error(
      "\n[next-dev-auto-clean] Stale .next chunk cache detected. Clearing .next and restarting dev server…\n"
    );
    isRestarting = true;
    try {
      await killChild();
      child = null;
      cleanNextCache({ silent: true });
      console.error("[next-dev-auto-clean] Restarting Next.js.\n");
      scanBuf = "";
    } finally {
      isRestarting = false;
    }
    startDev();
  } catch (err) {
    console.error("[next-dev-auto-clean] Recovery failed:", err);
    process.exit(1);
  } finally {
    recoveryPending = false;
  }
}

function considerRecovery(chunk) {
  if (stopping || recoveryPending) return;
  scanBuf += chunk;
  if (scanBuf.length > 24_000) {
    scanBuf = scanBuf.slice(-24_000);
  }
  if (!CORRUPT_CHUNK_RE.test(scanBuf)) return;
  scanBuf = "";
  void recoverFromCorruptCache();
}

function startDev() {
  if (stopping) return;
  const args = [nextBin, "dev", ...extraArgs];
  child = spawn(process.execPath, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  });

  child.stdout.on("data", data => {
    process.stdout.write(data);
    considerRecovery(data.toString());
  });
  child.stderr.on("data", data => {
    process.stderr.write(data);
    considerRecovery(data.toString());
  });

  child.on("exit", (code, signal) => {
    child = null;
    if (isRestarting) {
      return;
    }
    if (stopping) {
      process.exit(code ?? 0);
      return;
    }
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

function forwardSignalToChild(sig) {
  if (child && !child.killed) {
    child.kill(sig);
  }
}

process.on("SIGINT", () => {
  stopping = true;
  forwardSignalToChild("SIGINT");
});
process.on("SIGTERM", () => {
  stopping = true;
  forwardSignalToChild("SIGTERM");
});

if (process.env.SKIP_NEXT_DEV_AUTO_CLEAN === "1") {
  const plain = spawn(process.execPath, [nextBin, "dev", ...extraArgs], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });
  plain.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
} else {
  startDev();
}
