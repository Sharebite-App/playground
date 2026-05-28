# Sharebite Interview Kits — Mid-Level Full-Stack AI Engineer

Five interview variants, each a self-contained 2-hour kit (Part 1: 60 min system design + PR review; Part 2: 60 min AI engineering). Themes are drawn from the Sharebite codebase (Backend, WebApp, corporate_admin) so the candidate engages with realistic problems.

## How to choose

| # | File | Theme | Skills emphasized | Difficulty | Best for hiring... |
|---|---|---|---|---|---|
| A | [variant-a-group-ordering.md](variant-a-group-ordering.md) | Group Ordering | Distributed correctness, state machines, real-time | Mid | Generalist AI engineer (default) |
| B | [variant-b-catering-events.md](variant-b-catering-events.md) | Catering Event Planner | Constraint modeling, scheduling, multi-vendor | Mid–Senior | Product/planning thinker |
| C | [variant-c-search-discovery.md](variant-c-search-discovery.md) | Restaurant Search | Search infra, ranking, latency | Mid | Retrieval/RAG depth |
| D | [variant-d-engage-chat-agent.md](variant-d-engage-chat-agent.md) | In-App Chat Assistant | Conversational state, websockets, sessions | Mid (AI-heavy) | Agent builder |
| E | [variant-e-allowance-spend.md](variant-e-allowance-spend.md) | Allowance & Spend | Multi-tenancy, financial correctness | Mid | Safety/correctness instincts |

## Scoring & evaluation

[evaluation.md](evaluation.md) is an honest assessment of these kits as a hiring instrument — what they discriminate well, where they don't, and the fixes applied.

[scoring-rubric.md](scoring-rubric.md) is a single consolidated scorecard that works for all five variants — dimensions, weights, red-flag gates, and a composite → hire-recommendation mapping. Each variant file still carries its own per-area "what Strong looks like" tables; the rubric turns those observations into a defensible number. **Read its calibration anchor first: OK-across-the-board is a HIRE at mid-level, not a borderline.**

## Live PR review (Variant C)

Variant C's Part 1B is also available as a **real GitHub PR** the candidate reviews in situ: `ai-eng-feature` → `ai-eng-base` ([playground#2](https://github.com/Sharebite-App/playground/pull/2)), backed by a fuller `search-service` codebase on those branches. Reviewer answer key: [variant-c-pr-review-key.md](variant-c-pr-review-key.md) — **reviewer-only; do not push to the candidate-facing branches.**

## What's in each file

1. **Pre-interview framing** to read aloud to the candidate
2. **Skill profile** — what this variant tests
3. **Part 1A** — system design prompt, rubric table, decision-forcing follow-ups
4. **Part 1B** — a ~100-line TypeScript PR snippet with planted bugs, expected-findings table, scoring rubric
5. **Part 2** — AI extension prompt, rubric, red/green flags, follow-ups
6. **Interconnection summary** — explicit mapping of how Part 2 reuses Part 1
7. **Time management** table

## Notes for the interviewer

- The PR snippets are TypeScript so a JS-focused candidate can engage natively. The bugs map to real issues in the actual codebase (Python Backend).
- Plant questions that *force decisions* — push the candidate past "it depends" answers.
- Score blockers vs. nits explicitly in the PR review. A strong candidate frames severity, a weak one lists everything as equal.
- The bridge prompt at the end of Part 1B is critical — it primes the candidate to carry their Part 1 design into Part 2.
- If Part 1A runs long, **shorten Part 1B, not Part 2**. Part 2 is the differentiating signal for an AI engineer hire.
