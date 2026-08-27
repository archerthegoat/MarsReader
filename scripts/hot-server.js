#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_WATCH_PATHS = [
  'server.js',
  'lib/sources.js',
  'lib/fetcher.js',
  'lib/store.js',
  'lib/deepseek.js',
  'lib/background-jobs.js',
  'lib/request-ai-config.js',
  'scripts/refresh-worker.js',
  'public/app.js',
  'public/index.html',
  'public/lucide-icons.js',
  'public/styles.css',
];
const WATCH_PATHS = String(process.env.QMREADER_HOT_RELOAD_PATHS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);
const watchedPaths = WATCH_PATHS.length ? WATCH_PATHS : DEFAULT_WATCH_PATHS;
const intervalMs = Math.max(
  250,
  Number.parseInt(process.env.QMREADER_HOT_RELOAD_INTERVAL_MS || '750', 10) || 750,
);
const host = String(process.env.HOST || '127.0.0.1').trim() || '127.0.0.1';
const port = String(process.env.PORT || '18081').trim() || '18081';
const cookieSecure = process.env.COOKIE_SECURE === undefined
  ? '0'
  : process.env.COOKIE_SECURE;
const localAuthBypass = process.env.MARSREADER_LOCAL_AUTH_BYPASS === undefined
  ? '1'
  : process.env.MARSREADER_LOCAL_AUTH_BYPASS;
const childEnv = {
  ...process.env,
  HOST: host,
  PORT: port,
  COOKIE_SECURE: cookieSecure,
  MARSREADER_LOCAL_AUTH_BYPASS: localAuthBypass,
};

let child = null;
let stopping = false;
let restartRequested = false;

function fileSignature(relativePath) {
  try {
    const stat = fs.statSync(path.join(ROOT, relativePath));
    return `${relativePath}:${stat.mtimeMs}:${stat.size}`;
  } catch (error) {
    return `${relativePath}:missing:${error.code || 'error'}`;
  }
}

function snapshot() {
  return watchedPaths.map(fileSignature).join('|');
}

let lastSnapshot = snapshot();

function startServer() {
  if (stopping) return;
  child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: childEnv,
    stdio: 'inherit',
  });
  child.once('exit', (code, signal) => {
    const restarting = restartRequested;
    child = null;
    restartRequested = false;
    if (stopping) {
      process.exit(0);
      return;
    }
    if (restarting) {
      startServer();
      return;
    }
    console.error(`[hot-server] server exited unexpectedly (${code ?? 'null'}${signal ? `, ${signal}` : ''})`);
    process.exitCode = code || 1;
  });
}

function requestRestart() {
  if (stopping || restartRequested || !child) return;
  restartRequested = true;
  console.log('[hot-server] source change detected; restarting server');
  child.kill('SIGTERM');
}

const poller = setInterval(() => {
  const current = snapshot();
  if (current === lastSnapshot) return;
  lastSnapshot = current;
  requestRestart();
}, intervalMs);

function stop() {
  if (stopping) return;
  stopping = true;
  clearInterval(poller);
  if (child) {
    child.kill('SIGINT');
    setTimeout(() => child && child.kill('SIGTERM'), 5000).unref();
    return;
  }
  process.exit(0);
}

process.once('SIGINT', stop);
process.once('SIGTERM', stop);

console.log(`[hot-server] watching ${watchedPaths.join(', ')}`);
console.log(`[hot-server] local URL: http://marsreader.localhost:${port}/`);
startServer();
