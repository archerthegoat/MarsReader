const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const deepseek = require('../lib/deepseek');

test('tweet system prompt carries the approved anti-AI writing boundaries', () => {
  const prompt = deepseek.DEFAULT_TWEET_SYSTEM_PROMPT;
  assert.match(prompt, /推文改写器/);
  assert.doesNotMatch(prompt, /中文推文改写助手/);
  assert.match(prompt, /事实/);
  assert.match(prompt, /机制/);
  assert.match(prompt, /不要杜撰/);
  assert.match(prompt, /X 的帖子/);
  assert.match(prompt, /短帖/);
  assert.match(prompt, /不限制段落数量/);
  assert.match(prompt, /输出结构由内容决定/);
  assert.match(prompt, /局部使用列表/);
  assert.match(prompt, /不要把全文改成列表/);
  assert.match(prompt, /行首使用“• ”/);
  assert.match(prompt, /不使用 Markdown/);
  assert.match(prompt, /身份和人称边界/);
  assert.match(deepseek.TWEET_STYLE_PROMPTS['share-rewrite'], /不保留原文链接/);
  assert.match(deepseek.TWEET_STYLE_PROMPTS['share-rewrite'], /原作者的第一人称经历/);
  assert.match(deepseek.TWEET_STYLE_PROMPTS.reflection, /观点感想/);
  assert.equal(deepseek.__test.normalizeTweetStyle('unknown-style'), 'share-rewrite');
});

test('tweet output cleaner returns copy-ready plain text while preserving links', () => {
  const cleaned = deepseek.__test.cleanTweetText('```markdown\n## 观点\n**关键判断** [原文](https://example.com/a)\n```');
  assert.equal(cleaned, '观点\n关键判断 原文（https://example.com/a）');
  assert.equal(cleaned.includes('```'), false);
  assert.equal(cleaned.includes('**'), false);
});

test('tweet draft generation uses the model response and returns a copy-ready draft', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    text: async () => JSON.stringify({
      choices: [{ message: { content: '一个具体事实。\n\n这件事改变了产品竞争的机制。' } }],
    }),
  });
  try {
    const result = await deepseek.generateTweetDraft({
      id: 'tweet-test-entry',
      title: 'A concrete AI change',
      summary: 'A short source summary',
      content: '<p>The source explains a meaningful product shift.</p>',
      link: 'https://example.com/article',
    }, {
      provider: 'custom',
      providerName: 'Test provider',
      providerType: 'openai_compatible',
      apiKey: 'test-key-not-logged',
      baseUrl: 'https://example.com/v1',
      model: 'test-model',
      systemPrompt: deepseek.DEFAULT_TWEET_SYSTEM_PROMPT,
    });
    assert.equal(result.draft, '一个具体事实。\n\n这件事改变了产品竞争的机制。');
    assert.equal(result.model, 'test-model');
  } finally {
    global.fetch = originalFetch;
  }
});

test('tweet style is carried into the model prompt while article material stays reference-only', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => JSON.stringify({
        choices: [{ message: { content: '先说明文章的有效信息。\n\n再给出基于角度的判断。' } }],
      }),
    };
  };
  try {
    const result = await deepseek.generateTweetDraft({
      id: 'tweet-style-test-entry',
      title: 'A useful source',
      summary: 'A useful source summary',
      content: '<p>The source contains the facts that should be checked.</p>',
      link: 'https://example.com/style',
    }, {
      provider: 'custom',
      providerName: 'Test provider',
      providerType: 'openai_compatible',
      apiKey: 'test-key-not-logged',
      baseUrl: 'https://example.com/v1',
      model: 'test-model',
      style: 'reflection',
      angle: '关注它对投资者意味着什么',
      systemPrompt: deepseek.DEFAULT_TWEET_SYSTEM_PROMPT,
    });
    assert.equal(result.style, 'reflection');
    assert.equal(requests.length, 1);
    assert.match(requests[0].messages[0].content, /当前写作方式：观点感想/);
    assert.match(requests[0].messages[1].content, /当前任务：润色原稿/);
    assert.match(requests[0].messages[1].content, /参考资料/);
    assert.match(requests[0].messages[1].content, /不要直接复制或逐句替换原文/);
    assert.match(requests[0].messages[1].content, /关注它对投资者意味着什么/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('tweet length stays independent while the content chooses its structure', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => JSON.stringify({ choices: [{ message: { content: '先给出背景判断。\n\n- 第一条观点\n2. 第二条观点\n\n最后回到结论。' } }] }),
    };
  };
  try {
    const result = await deepseek.generateTweetDraft({
      id: 'tweet-structure-test-entry',
      title: 'A source',
      content: '<p>Facts and context.</p>',
      link: 'https://example.com/structure',
    }, {
      provider: 'custom',
      apiKey: 'test-key-not-logged',
      baseUrl: 'https://example.com/v1',
      model: 'test-model',
      format: 'short',
    });
    assert.equal(result.format, 'short');
    assert.equal(result.draft, '先给出背景判断。\n\n• 第一条观点\n• 第二条观点\n\n最后回到结论。');
    assert.match(requests[0].messages[0].content, /输出长度：短帖/);
    assert.match(requests[0].messages[0].content, /正文结构由内容决定/);
    assert.doesNotMatch(requests[0].messages[0].content, /写作结构：/);
    assert.equal(requests[0].max_tokens, 1100);
  } finally {
    global.fetch = originalFetch;
  }
});

test('tweet preserves pure natural paragraphs when no list is needed', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    text: async () => JSON.stringify({
      choices: [{ message: { content: '第一段说明一个判断。\n\n第二段补充它带来的影响。' } }],
    }),
  });
  try {
    const result = await deepseek.generateTweetDraft({
      id: 'tweet-bullet-list-test-entry',
      title: 'A source',
      content: '<p>Facts and context.</p>',
    }, {
      provider: 'custom',
      apiKey: 'test-key-not-logged',
      baseUrl: 'https://example.com/v1',
      model: 'test-model',
    });
    assert.equal(result.draft, '第一段说明一个判断。\n\n第二段补充它带来的影响。');
    assert.doesNotMatch(result.draft, /^•/m);
  } finally {
    global.fetch = originalFetch;
  }
});

test('share output strips links before normalizing model-selected list markers', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    text: async () => JSON.stringify({
      choices: [{ message: { content: '先说背景。\n\n1. 第一条判断。\n\n2. 原文链接：https://example.com/should-not-appear\n\n3、第三条判断。\n\n最后收束。' } }],
    }),
  });
  try {
    const result = await deepseek.generateTweetDraft({
      id: 'tweet-share-bullet-link-test-entry',
      title: 'A source',
      content: '<p>Facts and context.</p>',
      link: 'https://example.com/source',
    }, {
      provider: 'custom',
      apiKey: 'test-key-not-logged',
      baseUrl: 'https://example.com/v1',
      model: 'test-model',
    });
    assert.equal(result.draft, '先说背景。\n\n• 第一条判断。\n• 第三条判断。\n\n最后收束。');
    assert.doesNotMatch(result.draft, /https?:\/\//);
  } finally {
    global.fetch = originalFetch;
  }
});

test('share rewrite removes source links and excludes them from the model material', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => JSON.stringify({
        choices: [{ message: { content: '同一个判断，换一种说法。\n\n原文链接：https://example.com/should-not-appear' } }],
      }),
    };
  };
  try {
    const result = await deepseek.generateTweetDraft({
      id: 'tweet-share-link-test-entry',
      title: 'A source with a link',
      summary: 'A source summary',
      content: '<p>The public claim should be restated.</p>',
      link: 'https://example.com/source',
    }, {
      provider: 'custom',
      providerName: 'Test provider',
      providerType: 'openai_compatible',
      apiKey: 'test-key-not-logged',
      baseUrl: 'https://example.com/v1',
      model: 'test-model',
      style: 'share-rewrite',
    });
    assert.equal(result.draft, '同一个判断，换一种说法。');
    assert.doesNotMatch(requests[0].messages[1].content, /https:\/\/example\.com\/source/);
    assert.match(requests[0].messages[1].content, /不保留任何原文链接/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('reflection mode refuses to invent a user draft', async () => {
  await assert.rejects(
    () => deepseek.generateTweetDraft({ id: 'tweet-reflection-empty' }, {
      provider: 'custom',
      apiKey: 'test-key-not-logged',
      baseUrl: 'https://example.com/v1',
      model: 'test-model',
      style: 'reflection',
    }),
    error => error && error.statusCode === 400 && /需要用户先提供/.test(error.message),
  );
});

test('tweet feature is the visible side workspace while the AI companion remains reversible', () => {
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
  assert.match(html, /id="tweet-draft-stop"/);
  assert.match(html, /id="tweet-draft-clear"/);
  assert.match(html, /<textarea id="tweet-output"/);
  assert.match(html, /id="tweet-output" class="tweet-textarea tweet-output"/);
  assert.match(html, /aria-label="推文草稿，可直接编辑"/);
  assert.doesNotMatch(html, /可编辑草稿/);
  assert.doesNotMatch(html, /自动保存最新一版/);
  assert.match(html, /id="tweet-user-input" class="tweet-textarea"/);
  assert.match(html, /id="tweet-instruction" class="tweet-textarea"/);
  assert.match(html, /styles\.css\?v=191/);
  assert.match(html, /app\.js\?v=190/);
  assert.ok(tweetToolbarIndex >= 0 && copyToolbarIndex >= 0 && tweetToolbarIndex < copyToolbarIndex);
  assert.doesNotMatch(html, /id="context-pane-title"/);
  assert.match(html, /id="context-close-slot"/);
  assert.match(html, /id="tweet-side-close-slot"/);
  assert.match(html, /id="tweet-system-prompt"/);
  assert.match(html, /id="tweet-style-prompt-share-rewrite"/);
  assert.match(html, /id="tweet-style-prompt-reflection"/);
  assert.match(html, /class="ai-form-section tweet-system-prompt-settings"/);
  assert.match(html, /id="agent-side-panel"[^>]*hidden/);
  assert.match(html, /data-tweet-style="share-rewrite"/);
  assert.match(html, /data-tweet-style="reflection"/);
  assert.match(html, /data-tweet-task="share"/);
  assert.match(html, /data-tweet-task="polish"/);
  assert.match(html, /data-tweet-task="supplement"/);
  assert.match(html, /确定写作起点/);
  assert.match(html, /设定成稿/);
  assert.match(html, /确认理解并生成/);
  assert.match(html, /讲清文章的观点/);
  assert.match(html, /润色我的原稿/);
  assert.match(html, /写完整我的判断/);
  assert.match(html, /id="tweet-user-input-step-one"/);
  assert.match(html, /id="tweet-share-angle-slot"/);
  assert.match(html, /id="tweet-instruction-field"/);
  assert.doesNotMatch(html, /tweet-task-requirement/);
  assert.match(html, /id="tweet-format-options"/);
  assert.doesNotMatch(html, /id="tweet-structure-options"/);
  assert.doesNotMatch(html, /data-tweet-structure/);
  assert.doesNotMatch(html, /data-tweet-format="bullets"/);
  assert.doesNotMatch(html, /data-tweet-format="thread"/);
  assert.doesNotMatch(html, /class="tweet-guardrails"/);
  assert.doesNotMatch(html, /class="tweet-quality-grid"/);
  assert.match(html, /id="tweet-tone-options"/);
  assert.match(html, /id="tweet-instruction"/);
  assert.match(html, /id="tweet-understanding-task"/);
  assert.match(app, /\/api\/entry\/\$\{encodeURIComponent\(entry\.id\)\}\/tweet-draft/);
  assert.match(app, /\/api\/me\/tweet-drafts/);
  assert.match(app, /method: 'PATCH'/);
  assert.match(app, /function stopTweetDraft\(\)/);
  assert.match(app, /TWEET_SYSTEM_PROMPT_STORAGE_KEY/);
  assert.match(app, /renderTweetSystemPromptSettings/);
  assert.match(app, /TWEET_STYLE_STORAGE_KEY/);
  assert.match(app, /tweetUserInput/);
  assert.match(app, /输出结构由内容决定/);
  assert.match(app, /行首使用“• ”/);
  assert.match(app, /function syncTweetStepRail\(\)/);
  assert.match(app, /new ResizeObserver/);
  assert.match(app, /scheduleTweetStepRailSync/);
  assert.match(app, /function placeTweetUserInput\(/);
  assert.match(app, /normalizedTask === 'share' \? shareAngleSlot : startSlot/);
  assert.match(app, /startSlot\.hidden = normalizedTask === 'share'/);
  assert.match(app, /shareAngleSlot\.hidden = normalizedTask !== 'share'/);
  assert.match(app, /instructionField\.hidden = normalizedTask === 'share' && !hasSavedShareInstruction/);
  assert.match(app, /function placeContextCloseButton\(/);
  assert.match(app, /panel === 'tweet' \? tweetCloseSlot : contextCloseSlot/);
  assert.match(app, /placeContextCloseButton\(next\)/);
  assert.doesNotMatch(app, /context-pane-title/);
  assert.doesNotMatch(app, /tweet-task-requirement/);
  assert.match(app, /stylePrompt/);
  assert.match(app, /body: JSON\.stringify\(\{/);
  assert.match(app, /userDraft: userInput/);
  assert.match(app, /instruction,/);
  assert.match(app, /task,/);
  assert.match(app, /format: normalizeTweetFormat/);
  assert.doesNotMatch(app, /normalizeTweetStructure/);
  assert.doesNotMatch(app, /tweetStructure/);
  assert.match(app, /tone: normalizeTweetTone/);
  assert.match(app, /elementTextForCopy\(\$\('#rewrite-content'\)\)/);
});
