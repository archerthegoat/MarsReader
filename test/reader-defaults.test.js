const { after, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marsreader-reader-defaults-'));
process.env.QMREADER_DATA_DIR = testDataDir;
delete process.env.ADMIN_EMAIL;
delete process.env.ADMIN_PASSWORD;

const store = require('../lib/store');
const sources = require('../lib/sources').SOURCES;
const fetcherSource = fs.readFileSync(path.join(__dirname, '..', 'lib', 'fetcher.js'), 'utf8');
const appSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

after(() => fs.rmSync(testDataDir, { recursive: true, force: true }));

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

test('reader opens original content by default and keeps rewrite as an explicit tab', () => {
  assert.match(appSource, /const DEFAULT_READER_OPEN_TAB = 'original';/);
  assert.match(appSource, /const READER_OPEN_TABS = \['original', 'rewrite'\];/);
  assert.match(indexSource, /data-profile-reader-tab="original" aria-checked="true">原文/);
  assert.match(indexSource, /data-profile-reader-tab="rewrite" aria-checked="false">中文改写/);
});

test('article list defaults to 300 entries and failed favicons become visible letter fallbacks', () => {
  assert.match(fetcherSource, /function getEntries\(\{/);
  assert.match(fetcherSource, /limit = 300/);
  assert.match(appSource, /this\.naturalWidth <= 1 \|\| this\.naturalHeight <= 1/);
  assert.match(appSource, /data-favicon-letter/);
  assert.match(appSource, /loading="eager"/);
  assert.match(appSource, /onerror="fallbackFavicon\(this,/);
});

test('personal reader hides multi-user entry points and removes the retired source from normal metadata', () => {
  const retired = sources.find(source => source.id === 'theresanaiforthat');
  assert.equal(retired && retired.hidden, true);
  assert.equal(retired && retired.enabled, false);
  const submissions = sources.find(source => source.id === 'user-submitted');
  assert.equal(submissions && submissions.hidden, true);
  assert.equal(submissions && submissions.enabled, false);
  assert.match(indexSource, /data-view="contributors"[^>]*hidden/);
  assert.match(indexSource, /data-view="hot"[^>]*hidden/);
  assert.match(indexSource, /data-list-scope="hot"[^>]*hidden/);
  assert.match(indexSource, /id="submit-link-open"[^>]*hidden/);
  assert.match(indexSource, /id="article-link-submit"[^>]*hidden/);
  assert.match(indexSource, /id="account-menu-profile"[^>]*hidden/);
  assert.match(indexSource, /data-list-scope="assets"[^>]*hidden[^>]*>已改写资产/);
  assert.match(indexSource, /id="entry-pane-tabs"[^>]*hidden/);
  assert.match(indexSource, /id="reader-rail-like"[^>]*hidden/);
  assert.match(indexSource, /id="reader-rail-annotation"[^>]*hidden/);
  assert.match(indexSource, /data-dashboard-tab="contributions"[^>]*hidden/);
  assert.match(indexSource, /id="context-tab-annotations"[^>]*hidden/);
  assert.match(appSource, /window\.QM_LUCIDE_ICONS/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'generate-lucide-icons.js'), 'utf8'), /\['pin', 'Pin'\]/);
  assert.match(appSource, /iconMarkup\('pin'/);
  assert.match(appSource, /const groups = \{ pinned: \[\], news: \[\], article: \[\], podcast: \[\] \}/);
  assert.match(appSource, /已改写资产/);
  assert.match(appSource, /const next = \['latest', 'assets', 'hot', 'unread'\]\.includes\(scope\)/);
  assert.match(appSource, /state\.assetFilter = 'rewrite';/);
  assert.doesNotMatch(indexSource, /id="reader-tweet"[^>]*>写成推文/);
  assert.match(indexSource, /id="tweet-system-prompt"/);
  assert.match(indexSource, /id="rewrite-status"/);
  assert.match(indexSource, /中文改写（对照）/);
  assert.doesNotMatch(indexSource, /title="中文翻译"/);
  assert.match(appSource, /const TRANSLATION_REWRITE_LABEL = '中文改写（对照）';/);
  assert.match(appSource, /function generateTweetDraft\(\)/);
  assert.match(appSource, /function renderRewriteStatus\(/);
  assert.match(appSource, /function enforcePersonalUiVisibility\(/);
  assert.match(appSource, /annotations: \{ label: '划线'.*visible: false \}/);
  assert.match(appSource, /comments: \{ label: '点评'.*visible: false \}/);
  assert.match(appSource, /chat: \{ label: '对话'.*visible: false \}/);
});

test('new users and env-seeded admins receive the original-reader default', () => {
  const reader = store.createUser({
    email: uniqueEmail('reader'),
    password: 'reader-password-123',
    displayName: 'Reader',
  });
  const admin = store.ensureAdminUser({
    email: uniqueEmail('admin'),
    password: 'admin-password-123',
    displayName: 'Admin',
  });

  assert.equal(reader.defaultReaderTab, 'original');
  assert.equal(admin.role, 'admin');
  assert.equal(admin.defaultReaderTab, 'original');
});
