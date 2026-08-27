const { after, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marsreader-local-auth-'));

after(() => fs.rmSync(testDataDir, { recursive: true, force: true }));

function waitForServer(child, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server startup timed out')), timeout);
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.stdout.on('data', chunk => {
      if (String(chunk).includes('Mars Reader listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once('exit', code => {
      clearTimeout(timer);
      reject(new Error(stderr || `server exited ${code}`));
    });
  });
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await new Promise(resolve => child.once('exit', resolve));
}

test('local hot mode bypasses login validation but keeps a durable admin identity', { timeout: 15000 }, async () => {
  const port = 45000 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      QMREADER_DATA_DIR: testDataDir,
      STARTUP_REFRESH_DELAY_MS: '-1',
      FRESHNESS_SWEEP_INTERVAL_MS: '-1',
      MARSREADER_LOCAL_AUTH_BYPASS: '1',
      ADMIN_EMAIL: '',
      ADMIN_PASSWORD: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer(child);

    const meResponse = await fetch(`${baseUrl}/api/me`);
    assert.equal(meResponse.status, 200);
    const me = await meResponse.json();
    assert.equal(me.authBypass, true);
    assert.equal(me.user.role, 'admin');
    assert.equal(me.user.displayName, '本地管理员');

    const statesResponse = await fetch(`${baseUrl}/api/me/entry-states`);
    assert.equal(statesResponse.status, 200);

    const adminResponse = await fetch(`${baseUrl}/api/admin/users`);
    assert.equal(adminResponse.status, 200);

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-used@example.com', password: 'not-used' }),
    });
    assert.equal(loginResponse.status, 200);
    assert.equal((await loginResponse.json()).authBypass, true);
  } finally {
    await stopServer(child);
  }
});

test('normal server mode still requires login when the bypass is disabled', { timeout: 15000 }, async () => {
  const normalDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marsreader-auth-enabled-'));
  const port = 46000 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      QMREADER_DATA_DIR: normalDataDir,
      STARTUP_REFRESH_DELAY_MS: '-1',
      FRESHNESS_SWEEP_INTERVAL_MS: '-1',
      MARSREADER_LOCAL_AUTH_BYPASS: '0',
      ADMIN_EMAIL: '',
      ADMIN_PASSWORD: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer(child);
    const meResponse = await fetch(`${baseUrl}/api/me`);
    assert.equal(meResponse.status, 200);
    const me = await meResponse.json();
    assert.equal(me.authBypass, false);
    assert.equal(me.user, null);

    const adminResponse = await fetch(`${baseUrl}/api/admin/users`);
    assert.equal(adminResponse.status, 403);
  } finally {
    await stopServer(child);
    fs.rmSync(normalDataDir, { recursive: true, force: true });
  }
});
