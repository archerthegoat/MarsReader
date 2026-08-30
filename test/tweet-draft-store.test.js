const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'marsreader-tweet-drafts-'));
process.env.QMREADER_DATA_DIR = testDataDir;

const store = require('../lib/store');

function entry(id, title, publishedTs = Date.now(), contentHash = `${id}-v1`) {
  return {
    id,
    sourceId: 'test-source',
    title,
    link: `https://example.com/${id}`,
    author: '测试作者',
    published: new Date(publishedTs).toISOString(),
    publishedTs,
    summary: '测试文章摘要',
    content: '<p>测试文章正文。</p>',
    contentHash,
  };
}

const owner = store.createUser({
  email: 'tweet-drafts@example.com',
  password: 'password-123',
  displayName: '推文草稿测试用户',
});

test('tweet drafts keep one latest editable record per user and entry', () => {
  store.upsertEntries([
    entry('tweet-draft-a', '第一篇文章'),
    entry('tweet-draft-b', '第二篇文章'),
  ]);
  const sourceHash = store.getEntry('tweet-draft-a').contentHash;

  const first = store.saveTweetDraft('tweet-draft-a', owner.id, {
    style: 'reflection',
    task: 'polish',
    format: 'bullets',
    tone: 'restrained',
    userInput: '我的真实判断',
    instruction: '重点说明为什么这件事值得关注',
    draft: '第一版草稿',
    sourceContentHash: sourceHash,
    model: 'test-model',
  });
  assert.equal(first.style, 'reflection');
  assert.equal(first.task, 'polish');
  assert.equal(first.format, 'long');
  assert.equal('structure' in first, false);
  assert.equal(first.tone, 'restrained');
  assert.equal(first.instruction, '重点说明为什么这件事值得关注');
  assert.equal(first.draft, '第一版草稿');
  assert.equal(first.stale, false);

  const latest = store.saveTweetDraft('tweet-draft-a', owner.id, {
    style: 'share-rewrite',
    task: 'share',
    format: 'short',
    tone: 'natural',
    userInput: '只保留核心判断',
    instruction: '删掉背景铺垫',
    draft: '最新草稿',
    sourceContentHash: sourceHash,
    model: 'test-model-v2',
  });
  assert.equal(latest.style, 'share-rewrite');
  assert.equal(latest.task, 'share');
  assert.equal(latest.format, 'short');
  assert.equal('structure' in latest, false);
  assert.equal(latest.tone, 'natural');
  assert.equal(latest.instruction, '删掉背景铺垫');
  assert.equal(latest.draft, '最新草稿');
  assert.equal(store.getUserTweetDrafts(owner.id).length, 1);
  assert.equal(store.getTweetDraft('tweet-draft-a', owner.id).draft, '最新草稿');
});

test('unified social drafts use compose metadata while legacy draft metadata remains readable', () => {
  store.upsertEntries([
    entry('tweet-draft-unified', '统一社交草稿'),
    entry('tweet-draft-legacy', '旧版观点草稿'),
  ]);

  const unified = store.saveTweetDraft('tweet-draft-unified', owner.id, {
    style: 'share-rewrite',
    userInput: '我的临时想法',
    draft: '统一任务生成的草稿',
  });
  assert.equal(unified.style, 'share-rewrite');
  assert.equal(unified.task, 'compose');
  assert.equal(unified.format, 'short');
  assert.equal(unified.tone, 'natural');

  const legacy = store.saveTweetDraft('tweet-draft-legacy', owner.id, {
    style: 'reflection',
    task: 'supplement',
    format: 'long',
    tone: 'pointed',
    userInput: '旧版观点',
    instruction: '旧版额外要求',
    draft: '旧版草稿',
  });
  assert.equal(legacy.style, 'reflection');
  assert.equal(legacy.task, 'supplement');
  assert.equal(legacy.userInput, '旧版观点');
  assert.equal(legacy.instruction, '旧版额外要求');
});

test('tweet drafts are marked stale when the source article changes', () => {
  store.upsertEntries([entry('tweet-draft-a', '第一篇文章（更新）', Date.now(), 'tweet-draft-a-v2')]);
  const draft = store.getTweetDraft('tweet-draft-a', owner.id);
  assert.equal(draft.draft, '最新草稿');
  assert.equal(draft.stale, true);
});

test('tweet drafts protect old entries from retention and can be cleared', () => {
  const oldTs = Date.now() - 100 * 24 * 60 * 60 * 1000;
  store.upsertEntries([entry('tweet-draft-old', '有推文草稿的旧文章', oldTs)]);
  store.saveTweetDraft('tweet-draft-old', owner.id, { draft: '保留的旧文章草稿' });

  const candidates = store.getEntryRetentionCandidates({ cutoffTs: Date.now() - 30 * 24 * 60 * 60 * 1000 });
  assert.equal(candidates.includes('tweet-draft-old'), false);

  assert.equal(store.deleteTweetDraft('tweet-draft-old', owner.id), true);
  assert.equal(store.getTweetDraft('tweet-draft-old', owner.id), null);
  assert.equal(store.deleteTweetDraft('tweet-draft-old', owner.id), false);
});
