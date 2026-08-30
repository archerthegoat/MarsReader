#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const LABEL = 'com.marsreader.local';
const HOST = '127.0.0.1';
const PORT = 8080;
const APP_DIR = path.resolve(__dirname, '..');
const LAUNCHCTL = '/bin/launchctl';
const LSOF = '/usr/sbin/lsof';
const PLUTIL = '/usr/bin/plutil';

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function servicePaths({ homeDir = os.homedir(), appDir = APP_DIR } = {}) {
  const launchAgentsDir = path.join(homeDir, 'Library', 'LaunchAgents');
  const logDir = path.join(homeDir, 'Library', 'Logs', 'MarsReader');
  return {
    appDir,
    launchAgentsDir,
    logDir,
    plistPath: path.join(launchAgentsDir, `${LABEL}.plist`),
    stdoutPath: path.join(logDir, 'stdout.log'),
    stderrPath: path.join(logDir, 'stderr.log'),
  };
}

function isExecutable(file) {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function findExecutable(name, env = process.env) {
  const explicit = name === 'node' ? String(env.MARSREADER_NODE_BIN || '').trim() : '';
  if (explicit) {
    const candidate = path.resolve(explicit);
    if (!isExecutable(candidate)) throw new Error(`Configured ${name} executable is not usable: ${candidate}`);
    return candidate;
  }

  for (const directory of String(env.PATH || '').split(path.delimiter).filter(Boolean)) {
    const candidate = path.resolve(directory, name);
    if (isExecutable(candidate)) return candidate;
  }
  return '';
}

function buildPlist({ appDir, nodeBin, stdoutPath, stderrPath }) {
  const values = { appDir, nodeBin, stdoutPath, stderrPath };
  for (const [key, value] of Object.entries(values)) {
    if (!String(value || '').trim()) throw new Error(`Missing plist value: ${key}`);
  }

  const serverPath = path.join(appDir, 'server.js');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(nodeBin)}</string>
    <string>${xmlEscape(serverPath)}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${xmlEscape(appDir)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key>
    <string>production</string>
    <key>HOST</key>
    <string>${HOST}</string>
    <key>PORT</key>
    <string>${PORT}</string>
    <key>COOKIE_SECURE</key>
    <string>0</string>
    <key>MARSREADER_LOCAL_AUTH_BYPASS</key>
    <string>0</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>5</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>Umask</key>
  <integer>63</integer>
  <key>StandardOutPath</key>
  <string>${xmlEscape(stdoutPath)}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(stderrPath)}</string>
</dict>
</plist>
`;
}

function execute(command, args, { allowFailure = false, inherit = false } = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    const detail = String(result.stderr || result.stdout || '').trim();
    throw new Error(`${path.basename(command)} failed (${result.status})${detail ? `: ${detail}` : ''}`);
  }
  return result;
}

function targetFor(uid = process.getuid && process.getuid()) {
  if (!Number.isInteger(uid) || uid < 0) throw new Error('Unable to determine the current macOS user id.');
  return `gui/${uid}/${LABEL}`;
}

function domainFor(uid = process.getuid && process.getuid()) {
  if (!Number.isInteger(uid) || uid < 0) throw new Error('Unable to determine the current macOS user id.');
  return `gui/${uid}`;
}

function parseLaunchctlOutput(output) {
  const text = String(output || '');
  const state = text.match(/^\s*state = (.+)$/m);
  const pid = text.match(/^\s*pid = (\d+)$/m);
  const lastExit = text.match(/^\s*last exit code = (.+)$/m);
  return {
    state: state ? state[1].trim() : '',
    pid: pid ? Number(pid[1]) : null,
    lastExit: lastExit ? lastExit[1].trim() : '',
  };
}

function launchctlSnapshot(uid) {
  const result = execute(LAUNCHCTL, ['print', targetFor(uid)], { allowFailure: true });
  if (result.status !== 0) return { loaded: false, state: '', pid: null, lastExit: '' };
  return { loaded: true, ...parseLaunchctlOutput(result.stdout) };
}

function listenerOwnedBy(pid, port = PORT) {
  if (!Number.isInteger(pid) || pid <= 0 || !isExecutable(LSOF)) return false;
  const result = execute(LSOF, [
    '-nP', '-a', '-p', String(pid), `-iTCP:${port}`, '-sTCP:LISTEN', '-t',
  ], { allowFailure: true });
  if (result.status !== 0) return false;
  return String(result.stdout || '').split(/\s+/).includes(String(pid));
}

function probeHttp({ host = HOST, port = PORT, timeoutMs = 1200 } = {}) {
  return new Promise(resolve => {
    const request = http.get({ host, port, path: '/', timeout: timeoutMs }, response => {
      response.resume();
      resolve({ ok: response.statusCode === 200, statusCode: response.statusCode || 0, error: '' });
    });
    request.once('timeout', () => request.destroy(new Error('timeout')));
    request.once('error', error => resolve({ ok: false, statusCode: 0, error: error.message }));
  });
}

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function waitForHealthy(context, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let snapshot = launchctlSnapshot(context.uid);
  let httpResult = { ok: false, statusCode: 0, error: 'not checked' };
  while (Date.now() < deadline) {
    snapshot = launchctlSnapshot(context.uid);
    if (snapshot.pid && listenerOwnedBy(snapshot.pid)) {
      httpResult = await probeHttp();
      if (httpResult.ok) return { snapshot, httpResult };
    }
    await sleep(250);
  }
  const detail = snapshot.lastExit ? `; last exit: ${snapshot.lastExit}` : '';
  throw new Error(
    `Mars Reader did not become healthy within ${timeoutMs}ms${detail}. `
      + `Inspect ${context.paths.stderrPath}`,
  );
}

function validateContext({ platform = process.platform, env = process.env } = {}) {
  if (platform !== 'darwin') throw new Error('Mars Reader LaunchAgent management is supported only on macOS.');
  const uid = process.getuid && process.getuid();
  const paths = servicePaths();
  const nodeBin = findExecutable('node', env);
  if (!nodeBin) throw new Error('node executable was not found in PATH.');
  if (!fs.existsSync(path.join(paths.appDir, 'package.json'))) throw new Error('package.json is missing from the app directory.');
  if (!fs.existsSync(path.join(paths.appDir, 'server.js'))) throw new Error('server.js is missing from the app directory.');
  for (const command of [LAUNCHCTL, LSOF, PLUTIL]) {
    if (!isExecutable(command)) throw new Error(`Required macOS command is unavailable: ${command}`);
  }
  return { uid, nodeBin, paths };
}

function writePlist(context) {
  fs.mkdirSync(context.paths.launchAgentsDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(context.paths.logDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(context.paths.logDir, 0o700);

  const plist = buildPlist({
    appDir: context.paths.appDir,
    nodeBin: context.nodeBin,
    stdoutPath: context.paths.stdoutPath,
    stderrPath: context.paths.stderrPath,
  });
  const temporaryPath = `${context.paths.plistPath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, plist, { encoding: 'utf8', mode: 0o600 });
    execute(PLUTIL, ['-lint', temporaryPath]);
    fs.renameSync(temporaryPath, context.paths.plistPath);
    fs.chmodSync(context.paths.plistPath, 0o600);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

function bootoutIfLoaded(context) {
  if (!launchctlSnapshot(context.uid).loaded) return false;
  execute(LAUNCHCTL, ['bootout', targetFor(context.uid)]);
  return true;
}

function bootstrap(context) {
  execute(LAUNCHCTL, ['enable', targetFor(context.uid)], { allowFailure: true });
  execute(LAUNCHCTL, ['bootstrap', domainFor(context.uid), context.paths.plistPath]);
}

async function installService(context) {
  writePlist(context);
  bootoutIfLoaded(context);
  bootstrap(context);
  const health = await waitForHealthy(context);
  console.log(`Mars Reader installed and healthy at http://${HOST}:${PORT}/ (pid ${health.snapshot.pid}).`);
  console.log(`LaunchAgent: ${context.paths.plistPath}`);
  console.log(`Logs: ${context.paths.logDir}`);
}

async function startService(context) {
  const snapshot = launchctlSnapshot(context.uid);
  if (snapshot.loaded) {
    execute(LAUNCHCTL, ['kickstart', '-k', targetFor(context.uid)]);
  } else {
    if (!fs.existsSync(context.paths.plistPath)) {
      throw new Error('LaunchAgent is not installed. Run npm run service:install first.');
    }
    bootstrap(context);
  }
  const health = await waitForHealthy(context);
  console.log(`Mars Reader is healthy at http://${HOST}:${PORT}/ (pid ${health.snapshot.pid}).`);
}

async function restartService(context) {
  if (!fs.existsSync(context.paths.plistPath)) {
    throw new Error('LaunchAgent is not installed. Run npm run service:install first.');
  }
  const snapshot = launchctlSnapshot(context.uid);
  if (snapshot.loaded) execute(LAUNCHCTL, ['kickstart', '-k', targetFor(context.uid)]);
  else bootstrap(context);
  const health = await waitForHealthy(context);
  console.log(`Mars Reader restarted and is healthy at http://${HOST}:${PORT}/ (pid ${health.snapshot.pid}).`);
}

async function stopService(context) {
  if (!bootoutIfLoaded(context)) {
    console.log('Mars Reader is already stopped for the current login session.');
    return;
  }
  await sleep(500);
  if (launchctlSnapshot(context.uid).loaded) throw new Error('LaunchAgent is still loaded after stop.');
  console.log('Mars Reader stopped for the current login session. It will start again at the next login unless uninstalled.');
}

async function uninstallService(context) {
  bootoutIfLoaded(context);
  if (fs.existsSync(context.paths.plistPath)) fs.unlinkSync(context.paths.plistPath);
  console.log('Mars Reader LaunchAgent removed. Application data and logs were preserved.');
}

async function printStatus(context) {
  const snapshot = launchctlSnapshot(context.uid);
  const httpResult = await probeHttp();
  const ownsListener = Boolean(snapshot.pid && listenerOwnedBy(snapshot.pid));
  console.log(`Label: ${LABEL}`);
  console.log(`Loaded: ${snapshot.loaded ? 'yes' : 'no'}`);
  console.log(`State: ${snapshot.state || 'stopped'}`);
  console.log(`PID: ${snapshot.pid || '-'}`);
  console.log(`Listener owned by service: ${ownsListener ? 'yes' : 'no'}`);
  console.log(`HTTP: ${httpResult.statusCode || 'unreachable'}`);
  if (snapshot.lastExit) console.log(`Last exit: ${snapshot.lastExit}`);
  console.log(`LaunchAgent: ${context.paths.plistPath}`);
  console.log(`Logs: ${context.paths.logDir}`);
}

function readTail(file, lineCount = 100, maxBytes = 64 * 1024) {
  if (!fs.existsSync(file)) return '(log file does not exist yet)';
  const size = fs.statSync(file).size;
  const length = Math.min(size, maxBytes);
  const descriptor = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(length);
    fs.readSync(descriptor, buffer, 0, length, size - length);
    const lines = buffer.toString('utf8').split('\n');
    while (lines.length && lines.at(-1) === '') lines.pop();
    return lines.slice(-lineCount).join('\n').trim() || '(empty log)';
  } finally {
    fs.closeSync(descriptor);
  }
}

function printLogs(context) {
  console.log(`== ${context.paths.stdoutPath} ==`);
  console.log(readTail(context.paths.stdoutPath));
  console.log(`\n== ${context.paths.stderrPath} ==`);
  console.log(readTail(context.paths.stderrPath));
}

function deployCommands(context, env = process.env) {
  const npmBin = findExecutable('npm', env);
  if (!npmBin) throw new Error('npm executable was not found in PATH.');
  return [
    [npmBin, ['test']],
    [context.nodeBin, ['--check', path.join(context.paths.appDir, 'server.js')]],
    [context.nodeBin, ['--check', path.join(context.paths.appDir, 'public', 'app.js')]],
    [context.nodeBin, ['--check', path.join(context.paths.appDir, 'scripts', 'macos-launchagent.js')]],
  ];
}

async function runLocalDeploy(context, {
  commandRunner = (command, args) => execute(command, args, { inherit: true }),
  restart = restartService,
  env = process.env,
} = {}) {
  for (const [command, args] of deployCommands(context, env)) commandRunner(command, args);
  await restart(context);
}

function printHelp() {
  console.log(`Usage: node scripts/macos-launchagent.js <action>

Actions:
  install    Generate, load, and verify the user LaunchAgent
  start      Load or restart the installed LaunchAgent
  stop       Stop it for the current login session
  restart    Restart it and verify PID, listener ownership, and HTTP
  status     Show launchd, listener, and HTTP status
  logs       Show the last 100 stdout and stderr lines
  uninstall  Unload and remove the generated plist; preserve logs and data
  deploy     Run tests and syntax checks, then restart only if they pass
`);
}

async function main(argv = process.argv.slice(2)) {
  const action = argv[0];
  if (!action || ['help', '--help', '-h'].includes(action)) {
    printHelp();
    return;
  }
  const context = validateContext();
  const actions = {
    install: installService,
    start: startService,
    stop: stopService,
    restart: restartService,
    status: printStatus,
    logs: printLogs,
    uninstall: uninstallService,
    deploy: runLocalDeploy,
  };
  if (!actions[action]) throw new Error(`Unknown action: ${action}`);
  await actions[action](context);
}

if (require.main === module) {
  main().catch(error => {
    console.error(`[marsreader-service] ${error.message || error}`);
    process.exitCode = 1;
  });
}

module.exports = {
  HOST,
  LABEL,
  PORT,
  buildPlist,
  deployCommands,
  findExecutable,
  launchctlSnapshot,
  parseLaunchctlOutput,
  probeHttp,
  readTail,
  runLocalDeploy,
  servicePaths,
  targetFor,
  xmlEscape,
};
