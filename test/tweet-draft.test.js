const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const deepseek = require('../lib/deepseek');

function mockTweetResponse(content, requests = null) {
  return async (_url, options) => {
    if (requests) requests.push(JSON.parse(options.body));
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => JSON.stringify({ choices: [{ message: { content } }] }),
    };
  };
}

function testAiConfig(overrides = {}) {
  return {
    provider: 'custom',
    providerName: 'Test provider',
    providerType: 'openai_compatible',
    apiKey: 'test-key-not-logged',
    baseUrl: 'https://example.com/v1',
    model: 'test-model',
    ...overrides,
  };
}

test('tweet system prompt defines one social-draft task and the approved voice', () => {
  const prompt = deepseek.DEFAULT_TWEET_SYSTEM_PROMPT;
  assert.match(prompt, /社交媒体草稿/);
  assert.match(prompt, /文章的重点和观点/);
  assert.match(prompt, /用户的临时想法/);
  assert.match(prompt, /事实/);
  assert.match(prompt, /机制/);
  assert.match(prompt, /通俗/);
  assert.match(prompt, /有趣/);
  assert.match(prompt, /情绪/);
  assert.match(prompt, /适度夸张/);
  assert.match(prompt, /不能夸大事实/);
  assert.match(prompt, /一般每段 1 到 2 句/);
  assert.match(prompt, /最多 3 句/);
  assert.match(prompt, /局部使用列表/);
  assert.match(prompt, /不要把全文改成列表/);
  assert.match(prompt, /行首使用“• ”/);
  assert.match(prompt, /不使用 Markdown/);
  assert.match(prompt, /身份和人称边界/);
  assert.doesNotMatch(prompt, /短帖|长帖|观点感想模式|分享改写模式/);
  assert.equal(deepseek.DEFAULT_TWEET_TASK, 'compose');
  assert.equal(deepseek.DEFAULT_TWEET_STYLE, 'share-rewrite');
  assert.equal(deepseek.__test.normalizeTweetTask('share'), 'compose');
  assert.equal(deepseek.__test.normalizeTweetTask('polish'), 'compose');
  assert.equal(deepseek.__test.normalizeTweetTask('supplement'), 'compose');
});

test('tweet output cleaner returns copy-ready plain text before link policy is applied', () => {
  const cleaned = deepseek.__test.cleanTweetText('```markdown\n## 观点\n**关键判断** [原文](https://example.com/a)\n```');
  assert.equal(cleaned, '观点\n关键判断 原文（https://example.com/a）');
  assert.equal(cleaned.includes('```'), false);
  assert.equal(cleaned.includes('**'), false);
});

test('tweet draft generation returns one editable unified-task draft', async () => {
  const originalFetch = global.fetch;
  global.fetch = mockTweetResponse('一个具体事实。\n\n这件事改变了产品竞争的机制。');
  try {
    const result = await deepseek.generateTweetDraft({
      id: 'tweet-test-entry',
      title: 'A concrete AI change',
      summary: 'A short source summary',
      content: '<p>The source explains a meaningful product shift.</p>',
      link: 'https://example.com/article',
    }, testAiConfig());
    assert.equal(result.draft, '一个具体事实。\n\n这件事改变了产品竞争的机制。');
    assert.equal(result.model, 'test-model');
    assert.equal(result.task, 'compose');
    assert.equal(result.style, 'share-rewrite');
    assert.equal(result.format, 'short');
    assert.equal(result.tone, 'natural');
    assert.equal(result.instruction, '');
  } finally {
    global.fetch = originalFetch;
  }
});

test('user thoughts take priority and legacy fields collapse into the unified task', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = mockTweetResponse('先保留用户判断。\n\n再用文章事实把机制讲清楚。', requests);
  try {
    const result = await deepseek.generateTweetDraft({
      id: 'tweet-thoughts-test-entry',
      title: 'A useful source',
      summary: 'A useful source summary',
      content: '<p>The source contains facts that should be checked.</p>',
      link: 'https://example.com/source-link',
    }, testAiConfig({
      task: 'supplement',
      style: 'reflection',
      format: 'long',
      tone: 'pointed',
      userDraft: '我更关心它为什么影响小团队。',
      instruction: '少讲产品背景，保留这个分歧。',
    }));
    assert.equal(result.task, 'compose');
    assert.equal(result.style, 'share-rewrite');
    assert.match(requests[0].messages[1].content, /用户的临时想法/);
    assert.match(requests[0].messages[1].content, /我更关心它为什么影响小团队/);
    assert.match(requests[0].messages[1].content, /少讲产品背景，保留这个分歧/);
    assert.match(requests[0].messages[1].content, /优先保留用户的判断、立场和人称/);
    assert.match(requests[0].messages[1].content, /参考资料/);
    assert.doesNotMatch(requests[0].messages[1].content, /https:\/\/example\.com\/source-link/);
    assert.doesNotMatch(requests[0].messages[0].content, /当前任务：|输出长度：|语气：/);
    assert.equal(requests[0].max_tokens, 1800);
  } finally {
    global.fetch = originalFetch;
  }
});

test('empty user thoughts are valid and make the article the writing source', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = mockTweetResponse('文章里最值得分享的，不是结果，而是它改变结果的方式。', requests);
  try {
    const result = await deepseek.generateTweetDraft({
      id: 'tweet-empty-thoughts-entry',
      title: 'A source',
      content: '<p>Facts and context.</p>',
    }, testAiConfig({ task: 'polish', style: 'reflection' }));
    assert.equal(result.task, 'compose');
    assert.match(requests[0].messages[1].content, /用户没有补充临时想法/);
    assert.match(requests[0].messages[1].content, /文章的公共信息/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('tweet keeps natural paragraphs and normalizes only model-selected list markers', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = mockTweetResponse('先给出背景判断。\n\n- 第一条观点\n2. 第二条观点\n\n最后回到结论。', requests);
  try {
    const result = await deepseek.generateTweetDraft({
      id: 'tweet-structure-test-entry',
      title: 'A source',
      content: '<p>Facts and context.</p>',
    }, testAiConfig());
    assert.equal(result.draft, '先给出背景判断。\n\n• 第一条观点\n• 第二条观点\n\n最后回到结论。');
    assert.match(requests[0].messages[0].content, /自然段/);
    assert.match(requests[0].messages[0].content, /局部使用列表/);
    assert.doesNotMatch(requests[0].messages[0].content, /输出长度：|写作结构：/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('tweet preserves pure natural paragraphs when no list is needed', async () => {
  const originalFetch = global.fetch;
  global.fetch = mockTweetResponse('第一段说明一个判断。\n\n第二段补充它带来的影响。');
  try {
    const result = await deepseek.generateTweetDraft({
      id: 'tweet-natural-paragraphs-entry',
      title: 'A source',
      content: '<p>Facts and context.</p>',
    }, testAiConfig());
    assert.equal(result.draft, '第一段说明一个判断。\n\n第二段补充它带来的影响。');
    assert.doesNotMatch(result.draft, /^•/m);
  } finally {
    global.fetch = originalFetch;
  }
});

test('all social drafts strip source and model-returned links', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = mockTweetResponse('先说背景。\n\n1. 第一条判断。\n\n2. 原文链接：https://example.com/should-not-appear\n\n3、第三条判断。\n\n最后收束。', requests);
  try {
    const result = await deepseek.generateTweetDraft({
      id: 'tweet-link-test-entry',
      title: 'A source',
      content: '<p>Facts and context.</p>',
      link: 'https://example.com/source',
    }, testAiConfig({ style: 'reflection', task: 'polish' }));
    assert.equal(result.draft, '先说背景。\n\n• 第一条判断。\n• 第三条判断。\n\n最后收束。');
    assert.doesNotMatch(result.draft, /https?:\/\//);
    assert.doesNotMatch(requests[0].messages[1].content, /https:\/\/example\.com\/source/);
    assert.match(requests[0].messages[1].content, /不保留原文链接/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('tweet feature exposes one optional thought field and one generation path', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  const tweetToolbarIndex = html.indexOf('id="reader-tweet-open"');
  const copyToolbarIndex = html.indexOf('id="reader-copy-link"');
  assert.doesNotMatch(html, /id="reader-tweet"/);
  assert.match(html, /id="tweet-side-panel"/);
  assert.match(html, /data-context-panel="tweet"/);
  assert.doesNotMatch(html, /id="tweet-draft-modal"/);
  assert.doesNotMatch(app, /shouldCollapseLeftForContext/);
  assert.match(app, /Left navigation and the right writing desk are independent user controls/);
  assert.match(html, /id="tweet-draft-reference"/);
  assert.match(html, /id="tweet-user-input" class="tweet-textarea"/);
  assert.match(html, /我的临时想法/);
  assert.match(html, /不写也可以/);
  assert.match(html, /id="tweet-draft-generate"/);
  assert.match(html, /id="tweet-draft-stop"/);
  assert.match(html, /id="tweet-draft-copy"/);
  assert.match(html, /id="tweet-draft-clear"/);
  assert.match(html, /id="tweet-output" class="tweet-textarea tweet-output"/);
  assert.match(html, /aria-label="推文草稿，可直接编辑"/);
  assert.doesNotMatch(html, /id="tweet-instruction"|tweet-workflow|data-tweet-task|data-tweet-format|data-tweet-tone|data-tweet-step/);
  assert.doesNotMatch(html, /确定写作起点|设定成稿|确认理解并生成|讲清文章的观点|润色我的原稿|写完整我的判断/);
  assert.match(html, /id="tweet-system-prompt"/);
  assert.doesNotMatch(html, /id="tweet-style-prompt-share-rewrite"|id="tweet-style-prompt-reflection"/);
  assert.match(html, /class="ai-form-section tweet-system-prompt-settings"/);
  assert.match(html, /id="agent-side-panel"[^>]*hidden/);
  assert.match(html, /styles\.css\?v=193/);
  assert.match(html, /app\.js\?v=192/);
  assert.ok(tweetToolbarIndex >= 0 && copyToolbarIndex >= 0 && tweetToolbarIndex < copyToolbarIndex);
  assert.match(html, /id="context-close-slot"/);
  assert.match(html, /id="tweet-side-close-slot"/);
  assert.match(app, /\/api\/entry\/\$\{encodeURIComponent\(entry\.id\)\}\/tweet-draft/);
  assert.match(app, /\/api\/me\/tweet-drafts/);
  assert.match(app, /method: 'PATCH'/);
  assert.match(app, /function stopTweetDraft\(\)/);
  assert.match(app, /function mergeLegacyTweetInput\(/);
  assert.match(app, /task: 'compose'/);
  assert.match(app, /userDraft: userInput/);
  assert.match(app, /const looksLikeLegacyDefault = isExactV7Default;/);
  assert.match(app, /if \(!draft && !userInput && !state\.tweetDraftRecord\) return null;/);
  assert.match(app, /state\.tweetDraft \? '重新生成' : '生成草稿'/);
  assert.match(app, /TWEET_SYSTEM_PROMPT_STORAGE_KEY/);
  assert.match(app, /renderTweetSystemPromptSettings/);
  assert.doesNotMatch(app, /function setTweetTask|function setTweetFormat|function setTweetTone|function syncTweetStepRail|function placeTweetUserInput/);
  assert.doesNotMatch(app, /tweetStylePrompts|stylePrompt|tweetInstruction|tweetStep/);
  assert.match(app, /elementTextForCopy\(\$\('#rewrite-content'\)\)/);
});
