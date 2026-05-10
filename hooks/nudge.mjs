#!/usr/bin/env node
// prompt-grill UserPromptSubmit nudge hook
// Advisory-only: never auto-executes, never modifies the prompt.
// Injects a short system-reminder when a prompt looks ambiguous (≥3 empty slots,
// short length, no anchors).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');

// 1. Off-switch (env-only — settings.json does not allow custom top-level keys)
if (process.env.PROMPT_GRILL_DISABLE_NUDGE === '1') process.exit(0);

// 2. Read stdin payload from Claude Code
let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let payload;
try { payload = JSON.parse(raw); } catch { process.exit(0); }
const prompt = String(payload?.prompt ?? payload?.user_prompt ?? '');
if (!prompt.trim()) process.exit(0);

// 3. Recursion guard: skip if prompt-grill is currently executing
const stateDir = join(CONFIG_DIR, '.cache');
if (existsSync(join(stateDir, 'prompt-grill.lock'))) process.exit(0);

const lower = prompt.toLowerCase();

// 4. Yield to user already invoking prompt-grill
const SELF_TRIGGERS = [
  'prompt-grill', '/prompt-grill',
  '프롬프트 다듬', 'grill 후 변환', 'ai가 알아듣게', '이 작업 명확',
];
if (SELF_TRIGGERS.some(k => lower.includes(k))) process.exit(0);

// 5. Simple-lookup whitelist (clearly unambiguous)
const LOOKUP_PATTERNS = [
  /^\s*(ls|cat|cd|pwd|which|where|head|tail|grep|find|echo|date)\b/i,
  /^\s*(show|list|display|print|read|open)\s+/i,
  /^\?\s*$/,
  /^[\s\S]{0,20}\?$/, // very short questions
];
if (LOOKUP_PATTERNS.some(p => p.test(prompt))) process.exit(0);

// 6. Slot-signal detection
const filePath = /[\w./\\-]+\.\w{1,6}\b/.test(prompt) || /\b(src|lib|tests?|app|components?|skills?)[\\/]/i.test(prompt);
const symbolAnchor = /\b[a-z][a-zA-Z0-9_]{2,}\(\)?/.test(prompt) || /[A-Z][a-zA-Z]{2,}\b/.test(prompt);
const constraint = /\b(must|should|cannot|never|only|preserve|keep|avoid|don'?t|반드시|절대|유지|보존|금지)\b/i.test(prompt);
const success = /\b(when |so that|in order to|test|verify|pass|criteria|성공|기준|되어야|동작|확인)\b/i.test(prompt);
const context = /\b(current|existing|after|before|because|since|기존|현재|이미|지금)\b/i.test(prompt);
const goalVerb = /\b(add|fix|refactor|build|create|update|remove|migrate|implement|investigate|review|만들|수정|추가|리팩|구현|검토|분석)\b/i.test(prompt);

const filledSlots =
  Number(goalVerb) +
  Number(filePath || context) +
  Number(constraint) +
  Number(success);

const tooShort = prompt.length < 200;
const noAnchor = !filePath && !symbolAnchor;

// Ambiguous = filled slots ≤ 2 AND short AND no anchors (conservative)
const isAmbiguous = filledSlots <= 2 && tooShort && noAnchor;
if (!isAmbiguous) process.exit(0);

// 7. Frequency limit: 3 unacknowledged nudges per session → silence
const sessionId = process.env.CLAUDE_SESSION_ID || 'default';
const counterPath = join(stateDir, `prompt-grill-nudge-${sessionId}.count`);
let count = 0;
try {
  if (existsSync(counterPath)) count = parseInt(readFileSync(counterPath, 'utf8'), 10) || 0;
} catch { /* ignore */ }
if (count >= 3) process.exit(0);
try {
  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
  writeFileSync(counterPath, String(count + 1));
} catch { /* ignore */ }

// 8. Emit nudge (advisory only)
const emptyEstimate = 5 - filledSlots;
const nudge = `<system-reminder>
prompt-grill nudge: this request looks like it has about ${emptyEstimate}/5 empty slots (Goal / Context / Constraints / Success / Output).
Suggest \`/prompt-grill\` to the user as a one-line option, then ask if they want it. Do not auto-invoke.
This nudge is advisory. Disable with env \`PROMPT_GRILL_DISABLE_NUDGE=1\` (place under \`settings.json > env\`).
</system-reminder>`;
process.stdout.write(nudge);
process.exit(0);
