---
name: prompt-grill
description: Convert vague natural-language work requests into AI-friendly XML-structured prompts, grilling the user grill-me-style on missing slots before translation. Use when user invokes /prompt-grill, says "프롬프트 다듬어줘" / "grill 후 변환" / "AI가 알아듣게 바꿔줘" / "prompt-grill", or hands off a vague task they want sharpened before execution.
---

# prompt-grill

Take a vague natural-language request → grill the user on missing slots → emit a clean, AI-friendly XML-structured prompt → offer to execute it in place.

## When this fires

Only on **explicit invocation**. Do NOT auto-fire on every vague request.

Triggers:
- `/prompt-grill`, `prompt-grill`
- "프롬프트 다듬어줘", "grill 후 변환", "AI가 알아듣게 바꿔줘", "이 작업 명확하게"

### Optional nudge hook

A companion `UserPromptSubmit` hook (`hooks/nudge.mjs`) **may suggest** invocation when a prompt looks ambiguous (≥3 empty slots, short length, no file-path anchors). The hook only injects a short reminder — it never auto-executes the skill, never modifies the prompt, and yields immediately to OMC magic keywords. The user must still type a trigger to start the workflow.

## The 5-slot contract

Output prompt has exactly 5 slots, each an XML tag:

| Slot | Tag | What it captures |
|------|-----|------------------|
| Goal | `<goal>` | One-sentence outcome, no qualifiers |
| Context | `<context>` | Files, current state, dependencies, environment |
| Constraints | `<constraints>` | Hard limits, non-goals, things to preserve |
| Success | `<success_criteria>` | Testable conditions for completion |
| Output | `<output_format>` | Deliverable form (diff, file, list, plan…) |

## Workflow

### 1. Receive
Read the user's raw request from `{{ARGUMENTS}}` or the immediate prior message.

### 2. Assess (Adaptive depth)
Score each slot 0–2 silently (missing / partial / clear). Sum (max 10) sets grill depth:
- **8–10**: skip grill, go straight to translation
- **5–7**: light grill — ask only the weakest 1–2 slots, max 2 rounds
- **0–4**: medium grill — one question at a time, target the weakest slot, until sum ≥ 7 or 5 rounds elapsed

**Before grilling, explore the codebase** for any slot that code can answer (file paths, current behavior, dependencies). Never ask the user what `Grep`/`Read` would tell you. This mirrors grill-me.

### 3. Grill loop (one question at a time)
Use `AskUserQuestion`. Each round:
- Name the targeted slot and why ("Constraints weakest — asking about boundaries")
- Provide your recommended answer as one option when you have a defensible default
- Stop early if user says "enough" / "go" / "build it" — proceed with current clarity, marking gaps in the output

Hard cap: 5 grill rounds. Soft warning at 3.

### 4. Translate
Emit the XML-structured prompt in a fenced code block. Preserve the user's voice for goal/intent; tighten only ambiguity. Do not invent facts.

````
```xml
<goal>{one sentence}</goal>
<context>
{bullet list of facts/paths/deps from codebase exploration + user answers}
</context>
<constraints>
{bullet list of hard limits and non-goals}
</constraints>
<success_criteria>
{bullet list of testable conditions}
</success_criteria>
<output_format>{deliverable form}</output_format>
```
````

If a slot was force-skipped, write `<slot>(unspecified — clarify during execution)</slot>` instead of guessing.

### 5. Present + Execute gate
After the code block, ask via `AskUserQuestion`:

> "이 프롬프트로 바로 실행할까요?"
> - **Execute now** — adopt the XML prompt as the active instruction and start the actual work in this session
> - **Revise slot X** — re-grill that one slot, then re-emit
> - **Just give me the prompt** — stop here; user will use it elsewhere

On **Execute now**: treat the XML-structured prompt as the new active instruction and proceed. Do NOT re-grill.

## Hard rules

- One question at a time — never batch (grill-me principle)
- Explore codebase before asking the user what code can answer
- Never silently invent constraints/success criteria — mark unspecified slots explicitly
- Never auto-execute without the explicit "Execute now" approval gate
- Never recurse: if invoked from inside a prompt-grill execution, refuse
- The nudge hook is **advisory only**: it must yield to OMC magic keywords, respect the off-switch (env `OMC_DISABLE_PROMPT_GRILL_NUDGE=1` or `DISABLE_OMC=1` — settings.json schema does not accept custom top-level keys, so put the env var under `settings.json > env`), and self-silence after 3 unacknowledged nudges per session

## See also

- `grill-me` — the relentless interview pattern this skill borrows
- `oh-my-claudecode:deep-interview` — heavier, math-gated cousin for complex specs needing a written spec file
- `write-a-skill` — meta-skill that produced this one
