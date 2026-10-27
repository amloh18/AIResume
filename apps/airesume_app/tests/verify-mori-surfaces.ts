/**
 * Mori surface checks — run with `npm run verify:mori-surfaces`.
 *
 * Mori is rendered by two hosts (the editor's AI panel and, before it, the
 * floating dock; plus the canvas entry points that feed it). They must be two
 * UIs over ONE conversation, not two conversations. These checks pin the store
 * contract that makes that true, and the one-shot queue that lets a canvas
 * affordance hand a prompt to a chat that is not mounted yet.
 */
import assert from 'node:assert/strict';
import {
  MORI_WELCOME_MESSAGE,
  moriChatStore,
  subscribeToMoriChat,
  type MoriChatMessage,
} from '../src/lib/stores/moriChatStore';

let checks = 0;
const ok = (label: string) => {
  checks += 1;
  console.log(`  ok  ${label}`);
};

const msg = (id: string, role: MoriChatMessage['role'], content: string): MoriChatMessage => ({
  id,
  role,
  content,
  timestamp: 0,
});

// ---------------------------------------------------------------------------
// 1. One conversation, whoever is reading it
// ---------------------------------------------------------------------------
moriChatStore.reset();
const initial = moriChatStore.getState();
assert.deepEqual(initial.messages, [MORI_WELCOME_MESSAGE]);
ok('a fresh session starts on the welcome message');

moriChatStore.setMessages((prev) => [...prev, msg('u1', 'user', 'tighten my summary')]);
const afterMessage = moriChatStore.getState();

// Two surfaces read the SAME snapshot object until a write happens.
assert.equal(moriChatStore.getState(), afterMessage);
assert.equal(afterMessage.messages.length, 2);
assert.equal(afterMessage.messages[1].content, 'tighten my summary');
ok('a message written by one surface is visible to every other');

let notifications = 0;
const unsubscribe = subscribeToMoriChat(() => { notifications += 1; });
moriChatStore.setChatId('chat-123');
assert.equal(notifications, 1);

// A no-op write must not churn subscribers into re-rendering.
moriChatStore.setChatId('chat-123');
assert.equal(notifications, 1);
unsubscribe();
moriChatStore.setChatId('chat-456');
assert.equal(notifications, 1, 'unsubscribed listeners must stop receiving writes');
moriChatStore.setChatId('chat-123');
ok('writes notify subscribers, no-op writes do not, unsubscribe stops delivery');

assert.equal(moriChatStore.getState().chatId, 'chat-123');
ok('chatId is shared, so switching surfaces continues the same server thread');

moriChatStore.setChatHistory([{ _id: 'chat-123', title: 'Tighten summary', updatedAt: '2026-01-01' }]);
moriChatStore.setLimitExhausted(true);
const shared = moriChatStore.getState();
assert.equal(shared.chatHistory.length, 1);
assert.equal(shared.limitExhausted, true);
ok('history and limit state are shared with the conversation');

// ---------------------------------------------------------------------------
// 2. The hand-off queue is one-shot
// ---------------------------------------------------------------------------
moriChatStore.queuePrompt({
  prompt: 'Rewrite my summary for a PM role',
  selection: { path: 'basics.summary', text: 'PM with 8 years.' },
});
assert.equal(moriChatStore.getState().pendingPrompt?.prompt, 'Rewrite my summary for a PM role');

const taken = moriChatStore.takePrompt();
assert.equal(taken?.prompt, 'Rewrite my summary for a PM role');
assert.deepEqual(taken?.selection, { path: 'basics.summary', text: 'PM with 8 years.' });
assert.equal(moriChatStore.getState().pendingPrompt, null, 'taking must clear the queue');
ok('a queued canvas prompt is delivered exactly once');

const second = moriChatStore.takePrompt();
assert.equal(second, null);
ok('draining an empty queue yields null (no duplicate send on remount)');

// A prompt queued while the chat is mid-request stays queued.
moriChatStore.queuePrompt({ prompt: 'Now the skills section', selection: null });
const stillQueued = moriChatStore.getState().pendingPrompt;
assert.equal(stillQueued?.prompt, 'Now the skills section');
ok('a prompt queued behind an in-flight request survives until drained');

// ---------------------------------------------------------------------------
// 3. New chat / sign-out hand-off resets the shared thread
// ---------------------------------------------------------------------------
moriChatStore.reset();
const reset = moriChatStore.getState();
assert.equal(reset.chatId, null);
assert.equal(reset.pendingPrompt, null);
assert.deepEqual(reset.messages, [MORI_WELCOME_MESSAGE]);
ok('reset clears the conversation and any queued prompt');

console.log(`\n${checks} checks passed`);
