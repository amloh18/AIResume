/**
 * AI provider layer — invariant harness for the VPS OpenAI-compatible gateway.
 * Run with: `npm run verify:ai-gateway`.
 *
 * Everything here is synthetic: a local HTTP server stands in for the gateway,
 * Ollama and the Gemini REST API, and `global.fetch` is rewritten so the test
 * never touches the network. That keeps the suite deterministic while still
 * exercising the real wire format (paths, headers, body, SSE frames).
 *
 * Invariants pinned here:
 *   - model hints are translated to gateway ids (Gemini ids, Claude ids, tiers)
 *   - the gateway is skipped entirely when OPENAI_BASE_URL is unset
 *   - the router prefers the gateway, then Ollama, then Gemini
 *   - a gateway failure degrades instead of taking AI down
 *   - a gateway-only deployment still reports AI as available (hasAIApiKeys)
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import Module from 'node:module';
import type { AddressInfo } from 'node:net';

// `server-only` throws outside a Next.js bundler. The availability helper we
// import below transitively pulls `@/lib/database`, which imports it — stub the
// guard for this harness only (it protects client bundles, not a node script).
const loadModule = (Module as any)._load;
(Module as any)._load = function (request: string, ...rest: any[]) {
  if (request === 'server-only' || request === 'client-only') return {};
  return loadModule.call(this, request, ...rest);
};

// ── Harness ─────────────────────────────────────────────────────────────────

type Result = { name: string; passed: boolean; detail: string };
const results: Result[] = [];

async function invariant(name: string, fn: () => void | string | Promise<void | string>) {
  try {
    const detail = await fn();
    results.push({ name, passed: true, detail: typeof detail === 'string' ? detail : '' });
  } catch (err: any) {
    results.push({ name, passed: false, detail: err?.message ?? String(err) });
  }
}

// ── Mock upstreams ──────────────────────────────────────────────────────────

interface RecordedRequest {
  method: string;
  path: string;
  authorization?: string;
  body: any;
}

const requests: RecordedRequest[] = [];

/** What the mock gateway should do on the next /v1/chat/completions call. */
let gatewayMode: 'ok' | 'parts' | 'stream' | 'fail' | 'empty' = 'ok';

const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8');
    let body: any = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      body = raw;
    }
    requests.push({
      method: req.method || 'GET',
      path: req.url || '/',
      authorization: req.headers.authorization as string | undefined,
      body,
    });

    // Gateway: health
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', busy_slots: 0, max_slots: 2 }));
      return;
    }

    // Gateway: models
    if (req.url === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [{ id: 'gemini-3.8-flash-medium' }] }));
      return;
    }

    // Gateway: chat completions
    if (req.url === '/v1/chat/completions' && req.method === 'POST') {
      if (gatewayMode === 'fail') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'agy CLI exited 1' } }));
        return;
      }
      if (gatewayMode === 'empty') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: '' } }] }));
        return;
      }
      if (gatewayMode === 'stream') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
        res.write('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n');
        res.write('data: {"choices":[{"delta":{"content":" world"}}]}\n\n');
        res.write(': keep-alive\n\n');
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
      const content =
        gatewayMode === 'parts'
          ? [{ type: 'text', text: 'part one ' }, { type: 'text', text: 'part two' }]
          : 'gateway reply';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ model: 'gemini-3.8-flash-medium', choices: [{ message: { content } }] }));
      return;
    }

    // Ollama: /api/tags is 404 so the router treats Ollama as down.
    if (req.url === '/ollama/api/tags') {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    if (req.url === '/ollama/api/chat' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: { content: 'ollama reply' } }));
      return;
    }

    // Gemini REST fallback: /gemini/v1beta/models/<model>:generateContent
    if (req.url?.startsWith('/gemini/') && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'gemini reply' }] } }] }));
      return;
    }

    res.writeHead(404);
    res.end('not found');
  });
});

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const origin = `http://127.0.0.1:${port}`;

  // Environment must be set before the modules under test are imported:
  // ai-router captures the Gemini key at module load.
  process.env.OPENAI_BASE_URL = `${origin}/v1`;
  process.env.OPENAI_API_KEY = 'dummy-token';
  process.env.DEFAULT_AI_MODEL = 'gemini-3.8-flash-medium';
  process.env.OLLAMA_BASE_URL = `${origin}/ollama`;
  process.env.GEMINI_API_KEY = 'test-gemini-key'; // secret-scan:allow test fixture
  // Keeps aiModelConfigService off Mongo (same guard it uses at build time).
  process.env.NEXT_PHASE = 'phase-production-build';

  // Route the hardcoded Gemini hostname at the mock server.
  const realFetch = globalThis.fetch;
  globalThis.fetch = ((input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? String(input);
    const rewritten = url.replace('https://generativelanguage.googleapis.com', `${origin}/gemini`);
    return realFetch(rewritten, init);
  }) as typeof fetch;

  const gateway = await import('../src/lib/utils/ai-gateway-client');
  const { aiRoute } = await import('../src/lib/utils/ai-router');
  const { hasAIApiKeys } = await import('../src/lib/utils/ai-api-helper');

  const gatewayCalls = () => requests.filter(r => r.path === '/v1/chat/completions');

  // ── Model translation ────────────────────────────────────────────────────
  await invariant('gateway ids pass through unchanged', () => {
    assert.equal(gateway.resolveGatewayModel('gemini-3.8-flash-high'), 'gemini-3.8-flash-high');
    assert.equal(gateway.resolveGatewayModel('opencode-free'), 'opencode-free');
  });

  await invariant('lite/fast hints map to the fast tier', () => {
    for (const hint of ['gemini-2.5-flash-lite', 'gemini-1.5-flash-lite', 'gpt-4o-mini', 'claude-haiku']) {
      assert.equal(gateway.resolveGatewayModel(hint), 'gemini-3.8-flash-low', hint);
    }
  });

  await invariant('deep-reasoning hints map to the high tier', () => {
    assert.equal(gateway.resolveGatewayModel('gemini-2.5-pro'), 'gemini-3.8-flash-high');
    assert.equal(gateway.resolveGatewayModel('claude-opus-4'), 'gemini-3.8-flash-high');
  });

  await invariant('Claude ids with no tier hint fall back to the default model', () => {
    assert.equal(gateway.resolveGatewayModel('claude-sonnet-4-5'), 'gemini-3.8-flash-medium');
  });

  await invariant('a plain Gemini id is NOT mistaken for a mini model', () => {
    // "geMINI" contains "mini": token matching must not treat it as the fast tier.
    assert.equal(gateway.resolveGatewayModel('gemini-2.5-flash'), 'gemini-3.8-flash-medium');
    assert.equal(gateway.resolveGatewayModel('gemini-1.5-flash'), 'gemini-3.8-flash-medium');
  });

  await invariant('unknown/absent hints use DEFAULT_AI_MODEL', () => {
    assert.equal(gateway.resolveGatewayModel('gemini-2.5-flash'), 'gemini-3.8-flash-medium');
    assert.equal(gateway.resolveGatewayModel(undefined), 'gemini-3.8-flash-medium');
  });

  await invariant('DEFAULT_AI_MODEL is honoured', () => {
    process.env.DEFAULT_AI_MODEL = 'opencode-free';
    assert.equal(gateway.resolveGatewayModel(undefined), 'opencode-free');
    process.env.DEFAULT_AI_MODEL = 'gemini-3.8-flash-medium';
  });

  // ── Configuration gating ─────────────────────────────────────────────────
  await invariant('gateway is enabled only when OPENAI_BASE_URL is set', () => {
    assert.equal(gateway.isGatewayConfigured(), true);
    const saved = process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_BASE_URL;
    assert.equal(gateway.isGatewayConfigured(), false);
    process.env.OPENAI_BASE_URL = saved;
  });

  await invariant('trailing slashes are stripped from the base URL', () => {
    const saved = process.env.OPENAI_BASE_URL;
    process.env.OPENAI_BASE_URL = `${origin}/v1///`;
    assert.equal(gateway.getGatewayBaseUrl(), `${origin}/v1`);
    process.env.OPENAI_BASE_URL = saved;
  });

  // ── Wire format ──────────────────────────────────────────────────────────
  await invariant('chat sends an OpenAI-shaped request with a bearer token', async () => {
    gatewayMode = 'ok';
    const before = gatewayCalls().length;
    const res = await gateway.gatewayChat({
      messages: [
        { role: 'system', content: 'be brief' },
        { role: 'user', content: 'hi' },
      ],
      model: 'gemini-2.5-flash',
      temperature: 0.2,
      maxTokens: 64,
    });

    const call = gatewayCalls()[before];
    assert.equal(call.path, '/v1/chat/completions');
    assert.equal(call.authorization, 'Bearer dummy-token');
    assert.equal(call.body.model, 'gemini-3.8-flash-medium');
    assert.equal(call.body.stream, false);
    assert.equal(call.body.temperature, 0.2);
    assert.equal(call.body.max_tokens, 64);
    assert.deepEqual(call.body.messages, [
      { role: 'system', content: 'be brief' },
      { role: 'user', content: 'hi' },
    ]);
    assert.equal(res.content, 'gateway reply');
    assert.equal(res.provider, 'gateway');
  });

  await invariant('array-style message parts are concatenated', async () => {
    gatewayMode = 'parts';
    const res = await gateway.gatewayChat({ messages: [{ role: 'user', content: 'x' }] });
    assert.equal(res.content, 'part one part two');
  });

  await invariant('non-2xx responses surface the provider status', async () => {
    gatewayMode = 'fail';
    await assert.rejects(
      () => gateway.gatewayChat({ messages: [{ role: 'user', content: 'x' }] }),
      /Gateway 500/
    );
  });

  await invariant('an empty completion is an error, not a silent blank answer', async () => {
    gatewayMode = 'empty';
    await assert.rejects(
      () => gateway.gatewayChat({ messages: [{ role: 'user', content: 'x' }] }),
      /empty completion/
    );
  });

  await invariant('streaming yields SSE deltas and ignores keep-alives', async () => {
    gatewayMode = 'stream';
    const deltas: string[] = [];
    for await (const delta of gateway.gatewayChatStream({ messages: [{ role: 'user', content: 'x' }] })) {
      deltas.push(delta);
    }
    assert.deepEqual(deltas, ['Hello', ' world']);
  });

  // ── Health ───────────────────────────────────────────────────────────────
  await invariant('health endpoint reports slot availability', async () => {
    const health = await gateway.getGatewayHealth();
    assert.deepEqual(health, { status: 'healthy', busySlots: 0, maxSlots: 2 });
    assert.equal(await gateway.gatewayHealthCheck(), true);
    assert.equal(await gateway.gatewayHasFreeSlot(), true);
  });

  await invariant('health returns null when the gateway is unset', async () => {
    const saved = process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_BASE_URL;
    assert.equal(await gateway.getGatewayHealth(), null);
    assert.equal(await gateway.gatewayHealthCheck(), false);
    process.env.OPENAI_BASE_URL = saved;
  });

  // ── Router precedence ────────────────────────────────────────────────────
  await invariant('router prefers the gateway when configured', async () => {
    gatewayMode = 'ok';
    const before = gatewayCalls().length;
    const res = await aiRoute([{ role: 'user', content: 'hi' }], { model: 'gemini-2.5-flash' });
    assert.equal(res.provider, 'gateway');
    assert.equal(res.content, 'gateway reply');
    assert.equal(gatewayCalls().length, before + 1);
  });

  await invariant('router falls back to Gemini when the gateway fails', async () => {
    gatewayMode = 'fail';
    const res = await aiRoute([{ role: 'user', content: 'hi' }]);
    assert.equal(res.provider, 'gemini');
    assert.equal(res.content, 'gemini reply');
    assert.equal(res.model, 'gemini-2.5-flash'); // resolved via aiModelConfigService defaults
  });

  await invariant('router never calls the gateway when it is unconfigured', async () => {
    gatewayMode = 'ok';
    const saved = process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_BASE_URL;
    const before = gatewayCalls().length;
    try {
      const res = await aiRoute([{ role: 'user', content: 'hi' }]);
      assert.equal(res.provider, 'gemini');
      assert.equal(gatewayCalls().length, before);
    } finally {
      process.env.OPENAI_BASE_URL = saved;
    }
  });

  // ── Availability gate ────────────────────────────────────────────────────
  await invariant('a gateway-only deployment still reports AI as available', () => {
    const savedKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      assert.equal(hasAIApiKeys(), true);
    } finally {
      process.env.GEMINI_API_KEY = savedKey;
    }
  });

  await invariant('no provider configured reports AI as unavailable', () => {
    const savedUrl = process.env.OPENAI_BASE_URL;
    const savedKey = process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.GEMINI_API_KEY;
    try {
      assert.equal(hasAIApiKeys(), false);
    } finally {
      process.env.OPENAI_BASE_URL = savedUrl;
      process.env.GEMINI_API_KEY = savedKey;
    }
  });

  // ── Report ───────────────────────────────────────────────────────────────
  server.close();
  globalThis.fetch = realFetch;

  const failed = results.filter(r => !r.passed);
  for (const r of results) {
    console.log(`${r.passed ? 'ok  ' : 'FAIL'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} invariants hold`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
