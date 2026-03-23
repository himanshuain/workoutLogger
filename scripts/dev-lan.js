#!/usr/bin/env node
/**
 * Prints a QR code for the LAN URL, then starts Next.js bound to 0.0.0.0.
 * Run: npm run dev:lan
 */
const { spawn } = require("child_process");
const { networkInterfaces } = require("os");
const path = require("path");
const qrcode = require("qrcode-terminal");

const PORT = process.env.PORT || "3000";
const projectRoot = path.join(__dirname, "..");

function getLanIp() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      const v4 = net.family === "IPv4" || net.family === 4;
      if (v4 && !net.internal) return net.address;
    }
  }
  return null;
}

const ip = getLanIp();
if (!ip) {
  console.error("Could not find a non-loopback IPv4 address. Is Wi‑Fi connected?");
  process.exit(1);
}

const url = `http://${ip}:${PORT}`;
console.log("\n  Same Wi‑Fi — scan with your phone:\n");
qrcode.generate(url, { small: true });
console.log(`\n  ${url}\n`);
console.log(
  "  Supabase → Authentication → URL configuration → add this to Redirect URLs:\n",
  `  ${url}/auth\n`,
);

const nextBin = require.resolve("next/dist/bin/next");
// OAuth uses window.location.origin — open the app via the URL above (or localhost on this machine).
const childEnv = { ...process.env };

const child = spawn(process.execPath, [nextBin, "dev", "-H", "0.0.0.0", "-p", PORT], {
  cwd: projectRoot,
  stdio: "inherit",
  env: childEnv,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
