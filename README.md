# prompt-grill

Turn vague natural-language work requests into clean, AI-friendly XML-structured prompts — by **grilling you on the missing slots first**.

A [Claude Code](https://www.anthropic.com/claude-code) skill in the spirit of `grill-me`: one focused question at a time, code-first exploration over user interrogation, and an explicit execute gate before any work starts.

---

## Why

LLM agents do better work when prompts are anchored. A request like *"이거 좀 정리해줘"* leaves Goal / Context / Constraints / Success / Output all empty — the agent has to either guess or hallucinate. `prompt-grill` short-circuits that: it scores your request against a 5-slot contract, asks only about the weakest slots, then emits a structured prompt the agent can actually execute against.

## The 5-slot contract

Every translated prompt has exactly five XML tags:

| Slot | Tag | What it captures |
|------|-----|------------------|
| Goal | `<goal>` | One-sentence outcome, no qualifiers |
| Context | `<context>` | Files, current state, dependencies, environment |
| Constraints | `<constraints>` | Hard limits, non-goals, things to preserve |
| Success | `<success_criteria>` | Testable conditions for completion |
| Output | `<output_format>` | Deliverable form (diff, file, list, plan…) |

## Workflow

1. **Receive** — read your raw request.
2. **Assess** — score each slot 0–2 silently. Sum sets grill depth (8–10 skip, 5–7 light, 0–4 medium).
3. **Explore first** — search the codebase for anything code can answer (file paths, current behavior). Never ask you what `Grep`/`Read` would tell.
4. **Grill** — `AskUserQuestion`, one slot at a time, naming why it's weakest. Hard cap 5 rounds.
5. **Translate** — emit the XML prompt in a fenced block. Unspecified slots are marked `(unspecified — clarify during execution)`, never invented.
6. **Execute gate** — ask whether to run the prompt now, revise a slot, or just hand it off.

## Triggers

The skill only fires on **explicit invocation**:

- `/prompt-grill`
- `prompt-grill`
- *"프롬프트 다듬어줘"*, *"grill 후 변환"*, *"AI가 알아듣게 바꿔줘"*, *"이 작업 명확하게"*

## Install

### Option A — clone directly into Claude Code's skills directory

```bash
git clone https://github.com/dotoricode/prompt-grill.git ~/.claude/skills/prompt-grill
```

(Windows PowerShell: `git clone https://github.com/dotoricode/prompt-grill.git $env:USERPROFILE\.claude\skills\prompt-grill`)

### Option B — clone elsewhere, then copy

```bash
git clone https://github.com/dotoricode/prompt-grill.git
cp -r prompt-grill ~/.claude/skills/prompt-grill
```

Verify Claude Code sees it:

```
/skills
```

…and `prompt-grill` should appear in the list.

## Optional nudge hook

The repo ships a `UserPromptSubmit` hook (`hooks/nudge.mjs`) that **suggests** invoking the skill when a prompt looks ambiguous (≥3 empty slots, short, no file-path anchors). It is advisory only:

- Never auto-executes the skill
- Never modifies your prompt
- Yields immediately to OMC magic keywords
- Self-silences after 3 unacknowledged nudges per session

### Enable it

Add the following to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/skills/prompt-grill/hooks/nudge.mjs"
          }
        ]
      }
    ]
  }
}
```

(Windows: replace `~/` with the absolute path, e.g. `C:\\Users\\<you>\\.claude\\skills\\prompt-grill\\hooks\\nudge.mjs`.)

### Disable it

Either remove the hook entry, or set an env var (the settings.json schema doesn't allow custom top-level keys, so put it under `env`):

```json
{
  "env": {
    "OMC_DISABLE_PROMPT_GRILL_NUDGE": "1"
  }
}
```

`DISABLE_OMC=1` also disables the nudge.

## Hard rules (skill behavior)

- One question at a time — never batch
- Explore codebase before asking the user what code can answer
- Never silently invent constraints/success criteria — mark unspecified slots explicitly
- Never auto-execute without the explicit "Execute now" approval gate
- Never recurse: if invoked from inside a prompt-grill execution, the skill refuses

## Related

- [`grill-me`](https://github.com/obra/superpowers) — the relentless interview pattern this skill borrows from
- `oh-my-claudecode:deep-interview` — heavier, math-gated cousin for complex specs needing a written spec file
- `write-a-skill` — the meta-skill that produced this one

## License

MIT — see [`LICENSE`](./LICENSE).
