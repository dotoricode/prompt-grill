# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-05-11

### Changed (BREAKING)
- Removed all coupling to oh-my-claudecode (OMC). The skill now operates standalone.
- Renamed env var `OMC_DISABLE_PROMPT_GRILL_NUDGE` to `PROMPT_GRILL_DISABLE_NUDGE`. The old name is no longer recognized.
- Dropped `DISABLE_OMC` env-var check.
- Dropped the `OMC_KEYWORDS` yield list from `hooks/nudge.mjs` (autopilot/ralph/ulw/ccg/etc.). The hook still yields to its own self-triggers and to simple lookup commands.
- Removed `oh-my-claudecode:deep-interview` from README "Related" section.
- Nudge `<system-reminder>` message is now English-only.

### Added
- `SKILL.md` now lists English glosses next to Korean trigger phrases and the Korean execute-gate question.

### Migration
- If you had `OMC_DISABLE_PROMPT_GRILL_NUDGE=1` in `settings.json > env`, rename it to `PROMPT_GRILL_DISABLE_NUDGE=1`.

## [0.1.3] - 2026-05-11

### Changed
- Rewrote "Why XML" to remove inline-header lists, signposted rule of three, and a negative-parallelism closer (humanizer self-audit).

## [0.1.2] - 2026-05-10

### Added
- "Why XML" section explaining the choice of XML tags over markdown/YAML.

### Changed
- Removed Korean phrases from README (English-only); skill triggers in Korean still listed in `SKILL.md`.

## [0.1.1] - 2026-05-10

### Changed
- Rewrote README in a personal voice: added "Why I built this", a concrete before/after example, and OpenCode install path.
- Reduced em-dash overuse and tricolon patterns flagged by humanizer-style review.

### Added
- `CHANGELOG.md`.

## [0.1.0] - 2026-05-10

### Added
- Initial open-source release.
- `SKILL.md` — 5-slot grill workflow (Goal / Context / Constraints / Success / Output).
- `hooks/nudge.mjs` — advisory `UserPromptSubmit` hook with off-switch and per-session frequency limit.
- README with install and hook setup.
- MIT license.
