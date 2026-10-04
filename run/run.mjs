#!/usr/bin/env node
// One-command launcher for NextStep.
//
//   node run/run.mjs            -> app on http://localhost:3000 using .env.local (hosted Supabase)
//   node run/run.mjs local      -> starts local Supabase (Docker) and runs the app against it
//   node run/run.mjs stop       -> stops the dev server and the local Supabase stack
//
// It installs dependencies if needed and stops any old dev server of this project first,
// because Next.js refuses to start a second one ("Another next dev server is already running").

import { execSync, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] ?? "hosted";
const PORT = 3000;
const isWindows = process.platform === "win32";

function log(message) {
  console.log(`\n[nextstep] ${message}`);
}

function fail(message) {
  console.error(`\n[nextstep] ${message}\n`);
  process.exit(1);
}

function run(command, options = {}) {
  return spawnSync(command, { cwd: root, shell: true, stdio: "inherit", ...options });
}

function capture(command) {
  try {
    return execSync(command, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

function killPid(pid) {
  if (!pid || pid === process.pid) return;
  if (isWindows) capture(`taskkill /PID ${pid} /T /F`);
  else capture(`kill -9 ${pid}`);
}

function pidsOnPort(port) {
  if (isWindows) {
    return [
      ...new Set(
        capture("netstat -ano -p tcp")
          .split(/\r?\n/)
          .filter((line) => line.includes("LISTENING") && new RegExp(`:${port}\\s`).test(line))
          .map((line) => Number(line.trim().split(/\s+/).pop())),
      ),
    ];
  }
  return capture(`lsof -ti tcp:${port}`).split(/\s+/).filter(Boolean).map(Number);
}

// Stop a previous dev server of this project (any port) and anything holding port 3000.
function stopOldDevServer() {
  const lock = join(root, ".next", "dev", "lock");
  if (existsSync(lock)) {
    try {
      const pid = Number(JSON.parse(readFileSync(lock, "utf8")).pid);
      if (pid) {
        log(`Stopping the previous dev server (PID ${pid})…`);
        killPid(pid);
      }
    } catch {
      // Lock is not readable JSON; the port check below still applies.
    }
  }
  for (const pid of pidsOnPort(PORT)) {
    log(`Port ${PORT} is in use by PID ${pid}; stopping it…`);
    killPid(pid);
  }
}

function ensureDependencies() {
  if (existsSync(join(root, "node_modules", "next"))) return;
  log("Installing dependencies (first run)…");
  if (run("pnpm install").status !== 0) fail("pnpm install failed. Is pnpm installed? Run: npm install -g pnpm");
}

function dockerRunning() {
  return spawnSync("docker info", { shell: true, stdio: "ignore" }).status === 0;
}

function localSupabaseEnv() {
  if (!dockerRunning()) {
    fail("Docker is not running. Start Docker Desktop, wait until it is ready, then run this again.");
  }
  log("Starting local Supabase (the first run downloads images and takes a few minutes)…");
  run("pnpm exec supabase start");

  let status = "";
  for (let attempt = 0; attempt < 30 && !status.includes("API_URL="); attempt++) {
    status = capture("pnpm exec supabase status -o env");
    if (!status.includes("API_URL=")) spawnSync(isWindows ? "timeout /t 3 >nul" : "sleep 3", { shell: true });
  }
  const read = (name) => new RegExp(`^${name}="?([^"\\r\\n]+)"?`, "m").exec(status)?.[1];
  const url = read("API_URL");
  const key = read("PUBLISHABLE_KEY") ?? read("ANON_KEY");
  if (!url || !key) fail("Local Supabase did not start. Try: pnpm exec supabase stop  and run this again.");

  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
    NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    mailbox: read("MAILPIT_URL") ?? read("INBUCKET_URL") ?? "http://127.0.0.1:54324",
  };
}

function startApp(extraEnv = {}) {
  log(`Starting the app on http://localhost:${PORT}  (press Ctrl+C to stop)`);
  const child = spawn(`pnpm exec next dev -p ${PORT}`, {
    cwd: root,
    shell: true,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

if (mode === "stop") {
  stopOldDevServer();
  if (dockerRunning()) run("pnpm exec supabase stop");
  log("Stopped.");
} else if (mode === "local") {
  ensureDependencies();
  stopOldDevServer();
  const { mailbox, ...env } = localSupabaseEnv();
  log(`Using the LOCAL database. Sign in with any email, then read the code at ${mailbox}`);
  startApp(env);
} else if (mode === "hosted") {
  ensureDependencies();
  if (!existsSync(join(root, ".env.local"))) {
    fail("No .env.local found. Copy .env.example to .env.local and fill in the Supabase URL and key,\n           or run the local version instead: pnpm dev:local  (run/run-local.bat on Windows).");
  }
  stopOldDevServer();
  log("Using the HOSTED database from .env.local.");
  startApp();
} else {
  fail(`Unknown mode "${mode}". Use: hosted (default), local, or stop.`);
}
