const { after, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  HOST,
  LABEL,
  PORT,
  buildPlist,
  deployCommands,
  findExecutable,
  parseLaunchctlOutput,
  readTail,
  runLocalDeploy,
  servicePaths,
  targetFor,
  xmlEscape,
} = require('../scripts/macos-launchagent');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'marsreader-launchagent-test-'));

after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

function fixtureContext() {
  return {
    uid: 501,
    nodeBin: '/tmp/marsreader-fixture/bin/node',
    paths: {
      appDir: '/tmp/Mars Reader & Notes',
      plistPath: '/tmp/Library/LaunchAgents/com.marsreader.local.plist',
      logDir: '/tmp/Library/Logs/MarsReader',
      stdoutPath: '/tmp/Library/Logs/MarsReader/stdout.log',
      stderrPath: '/tmp/Library/Logs/MarsReader/stderr.log',
    },
  };
}

test('service paths keep generated runtime state outside the repository', () => {
  const paths = servicePaths({ homeDir: '/Users/tester', appDir: '/code/MarsReader' });
  assert.equal(paths.appDir, '/code/MarsReader');
  assert.equal(paths.plistPath, '/Users/tester/Library/LaunchAgents/com.marsreader.local.plist');
  assert.equal(paths.logDir, '/Users/tester/Library/Logs/MarsReader');
});

test('plist is local-only, authenticated, restartable, and contains no secret variables', () => {
  const context = fixtureContext();
  const plist = buildPlist({
    appDir: context.paths.appDir,
    nodeBin: context.nodeBin,
    stdoutPath: context.paths.stdoutPath,
    stderrPath: context.paths.stderrPath,
  });

  assert.match(plist, new RegExp(`<string>${LABEL}</string>`));
  assert.match(plist, new RegExp(`<string>${HOST}</string>`));
  assert.match(plist, new RegExp(`<string>${PORT}</string>`));
  assert.match(plist, /<key>COOKIE_SECURE<\/key>\s*<string>0<\/string>/);
  assert.match(plist, /<key>MARSREADER_LOCAL_AUTH_BYPASS<\/key>\s*<string>0<\/string>/);
  assert.match(plist, /<key>RunAtLoad<\/key>\s*<true\/>/);
  assert.match(plist, /<key>KeepAlive<\/key>\s*<true\/>/);
  assert.match(plist, /Mars Reader &amp; Notes/);
  assert.doesNotMatch(plist, /0\.0\.0\.0/);
  assert.doesNotMatch(plist, /API_KEY|ADMIN_PASSWORD|DEEPSEEK/);
});

test('generated plist passes macOS plutil validation', { skip: process.platform !== 'darwin' }, () => {
  const context = fixtureContext();
  const plist = buildPlist({
    appDir: context.paths.appDir,
    nodeBin: context.nodeBin,
    stdoutPath: context.paths.stdoutPath,
    stderrPath: context.paths.stderrPath,
  });
  const plistPath = path.join(tempRoot, 'fixture.plist');
  fs.writeFileSync(plistPath, plist);
  const result = spawnSync('/usr/bin/plutil', ['-lint', plistPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('executable lookup preserves a stable PATH entry instead of resolving its target', () => {
  const binDir = path.join(tempRoot, 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  const nodePath = path.join(binDir, 'node');
  fs.writeFileSync(nodePath, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  assert.equal(findExecutable('node', { PATH: binDir }), nodePath);
});

test('explicit node override fails closed when it is not executable', () => {
  assert.throws(
    () => findExecutable('node', { MARSREADER_NODE_BIN: path.join(tempRoot, 'missing-node'), PATH: '' }),
    /not usable/,
  );
});

test('launchctl output parser exposes only lifecycle evidence', () => {
  const parsed = parseLaunchctlOutput(`
com.marsreader.local = {
  state = running
  pid = 4242
  last exit code = 1
}
`);
  assert.deepEqual(parsed, { state: 'running', pid: 4242, lastExit: '1' });
  assert.equal(targetFor(501), 'gui/501/com.marsreader.local');
});

test('local deploy runs tests and syntax checks before restart', async () => {
  const binDir = path.join(tempRoot, 'deploy-bin');
  fs.mkdirSync(binDir, { recursive: true });
  const npmPath = path.join(binDir, 'npm');
  fs.writeFileSync(npmPath, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const context = fixtureContext();
  const commands = deployCommands(context, { PATH: binDir });
  assert.equal(commands[0][0], npmPath);
  assert.deepEqual(commands[0][1], ['test']);
  assert.deepEqual(commands.slice(1).map(item => item[1][0]), ['--check', '--check', '--check']);

  const calls = [];
  let restarts = 0;
  await runLocalDeploy(context, {
    env: { PATH: binDir },
    commandRunner: (command, args) => calls.push([command, args]),
    restart: async () => { restarts += 1; },
  });
  assert.equal(calls.length, 4);
  assert.equal(restarts, 1);
});

test('local deploy never restarts when a validation command fails', async () => {
  const binDir = path.join(tempRoot, 'failing-deploy-bin');
  fs.mkdirSync(binDir, { recursive: true });
  const npmPath = path.join(binDir, 'npm');
  fs.writeFileSync(npmPath, '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  const context = fixtureContext();
  let restarts = 0;
  await assert.rejects(
    runLocalDeploy(context, {
      env: { PATH: binDir },
      commandRunner: () => { throw new Error('test gate failed'); },
      restart: async () => { restarts += 1; },
    }),
    /test gate failed/,
  );
  assert.equal(restarts, 0);
});

test('log tail is bounded and returns the latest lines', () => {
  const logPath = path.join(tempRoot, 'bounded.log');
  fs.writeFileSync(logPath, 'one\ntwo\nthree\nfour\n');
  assert.equal(readTail(logPath, 2), 'three\nfour');
  assert.equal(readTail(path.join(tempRoot, 'missing.log')), '(log file does not exist yet)');
});

test('XML escaping covers launchd string delimiters', () => {
  assert.equal(xmlEscape(`<&>"'`), '&lt;&amp;&gt;&quot;&apos;');
});
