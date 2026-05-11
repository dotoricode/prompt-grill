# prompt-grill

A Claude Code skill that turns half-formed work requests into structured prompts your agent can actually execute against. It interviews you about the parts you skipped, then emits an XML prompt with five named slots.

## Why I built this

I kept losing time the same way: I'd type a request like *"refactor this module"* into Claude Code, the agent would charge ahead with assumptions, and I'd spend the next ten minutes correcting course because I forgot to mention the constraint that mattered. Half my prompts were missing a success criterion. Most were missing the constraint I cared about most.

So I built `prompt-grill`. It scores my request against five slots — Goal, Context, Constraints, Success, Output — and only asks me about the ones I left empty. The questions are short and one at a time. By the time I see the structured prompt, the things I would have forgotten are already in it.

I use it almost daily now. It catches the slot I would have missed maybe four times out of five.

## How it works

You type `/prompt-grill <vague request>`. The skill:

1. Reads your request and silently scores each of the five slots from 0 to 2.
2. Reads the codebase for any slot that code can answer (file paths, current behavior). It will not ask you what `Grep` or `Read` could tell it.
3. If slots are still empty, asks you about the weakest one. One question. Then the next weakest. Capped at five rounds.
4. Emits an XML prompt in a fenced block. Anything you refused to clarify is marked `(unspecified — clarify during execution)`. The skill does not invent values.
5. Asks whether to run that prompt now, revise a single slot, or hand the prompt to you to use elsewhere.

## Why XML

Anthropic's prompt-engineering guide points to XML tags as the cleanest way to mark distinct sections, and Claude has been trained on a lot of them. Markdown and YAML both work, but each costs something this skill needed to avoid.

A line that starts with `## Constraints` can be confused with content the user pasted in. `<constraints>...</constraints>` cannot.

The agent also has to reference slots from inside its own reasoning. With XML tags it can say "the public-API rule in `<constraints>`" and point at exactly one place. Markdown sections do not survive that kind of reference.

When the execute gate offers to revise a single slot, the skill rewrites only that tag. The rest of the prompt stays byte-identical, which is harder to guarantee when slots are markdown headings.

The five tags map to the five slots verbatim, with no nesting and no attributes.

## The 5 slots

| Slot | Tag | What it captures |
|------|-----|------------------|
| Goal | `<goal>` | One-sentence outcome, no qualifiers |
| Context | `<context>` | Files, current state, dependencies, environment |
| Constraints | `<constraints>` | Hard limits, non-goals, things to preserve |
| Success | `<success_criteria>` | Testable conditions for completion |
| Output | `<output_format>` | Deliverable form (diff, file, list, plan…) |

## Example

**Before** (what I actually typed):

> clean up the login module

**After** the grill (3 questions, ~30 seconds):

```xml
<goal>Refactor src/auth/login.ts to remove the duplicated session validation block.</goal>
<context>
- File: src/auth/login.ts (4 functions, validateSession appears in 3)
- Callers: src/api/login.controller.ts, src/middleware/auth.ts
- Existing tests: tests/auth/login.test.ts (12 cases passing)
</context>
<constraints>
- Public API of login() must not change
- No new dependencies
- Keep TypeScript strict mode passing
</constraints>
<success_criteria>
- validateSession defined once
- All 12 existing tests still pass
- No new lint warnings
</success_criteria>
<output_format>Diff against current main, with a short note on what moved where.</output_format>
```

The "Constraints" line about the public API is the one I would have forgotten. It is the line that matters most.

## Triggers

The skill only fires when you ask for it:

- `/prompt-grill`
- `prompt-grill`
- localized trigger phrases (see [`SKILL.md`](./SKILL.md))

There is no auto-trigger.

## Install

Clone into Claude Code's skills directory:

```bash
git clone https://github.com/dotoricode/prompt-grill.git ~/.claude/skills/prompt-grill
```

If you use a custom skills path (e.g. `~/.claude-personal/skills`), replace the destination accordingly:

```bash
git clone https://github.com/dotoricode/prompt-grill.git ~/.claude-personal/skills/prompt-grill
```

Windows PowerShell:

```powershell
git clone https://github.com/dotoricode/prompt-grill.git $env:USERPROFILE\.claude\skills\prompt-grill
```

Then run `/skills` inside Claude Code. `prompt-grill` should appear in the list.

### OpenCode

OpenCode also reads `~/.claude/skills/`, so the same clone works. If you prefer the OpenCode-native path:

```bash
git clone https://github.com/dotoricode/prompt-grill.git ~/.config/opencode/skills/prompt-grill
```

## Optional nudge hook

The repo ships a `UserPromptSubmit` hook at `hooks/nudge.mjs`. When your prompt looks ambiguous (three or more empty slots, short, no file path), the hook prints a one-line reminder suggesting `/prompt-grill`. It does not modify your prompt, does not call the skill, and silences itself after three unacknowledged nudges per session.

To enable, add this to `~/.claude/settings.json`:

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

On Windows, use the absolute path: `C:\\Users\\<you>\\.claude\\skills\\prompt-grill\\hooks\\nudge.mjs`.

To disable without removing the entry, set an environment variable in the same settings file:

```json
{
  "env": {
    "PROMPT_GRILL_DISABLE_NUDGE": "1"
  }
}
```

## Skill behavior contract

- One question at a time. The skill will not batch.
- The skill reads code before it asks you anything code could answer.
- Slots you refuse to clarify are marked unspecified, not guessed.
- The skill never starts the actual work without the explicit "Execute now" approval.
- The skill refuses to recurse: if it is already running, a second invocation is rejected.

## Related

- [`grill-me`](https://github.com/mattpocock/skills) by Matt Pocock — the interview pattern this skill is based on.
- [`cerberus`](https://github.com/dotoricode/cerberus) — wires prompt-grill (head 1), grill-me (head 2), and an intent gate (head 3) into a single 3-gate verification workflow.
- `write-a-skill` — used to scaffold this skill.

## License

MIT. See [`LICENSE`](./LICENSE).
