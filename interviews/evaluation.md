# Evaluation — How good are these as interview questions?

An honest assessment of the five Sharebite kits as instruments for hiring a mid-level full-stack AI engineer. Companion to [scoring-rubric.md](scoring-rubric.md).

## Verdict

**Strong, above-average interview material — usable today.** The structure (system design → PR review → AI extension, with each part feeding the next) generates genuinely interconnected signal that most homegrown kits don't. The rubrics, decision-forcing follow-ups, and red/green flags do real work reducing interviewer variance. The two material weaknesses are inherent trade-offs of the design, not defects: they **discriminate senior-from-mid far better than mid-from-junior**, and they **reward a specific background** (financial concurrency, multi-tenancy, RAG/text-to-SQL) in ways that can mis-score an otherwise-qualified candidate from an adjacent specialty.

## Scorecard

| Dimension | Grade | One-line |
|---|---|---|
| Discrimination (top-end) | **A** | Cleanly separates "thinks in failure modes / LLM-isn't-a-boundary" from "happy-path only." |
| Discrimination (bottom-end) | **C** | A trainable mid who hasn't met these exact patterns bottoms out flat — no-signal, not differentiated. |
| Level calibration | **B+** | Content is mid–senior; the Weak/OK/Strong tiers *are* the mid calibration, but only if the interviewer holds the line (the #1 misuse risk). |
| Coverage / breadth | **A−** | Each variant exercises data modeling, concurrency, integration, safety, eval, cost — broad without being shallow. |
| Fairness / background bias | **C+** | Rewards prior exposure to a narrow class of systems; a frontend-leaning full-stack+AI candidate can score low for orthogonal reasons. |
| Realism / engagement | **A−** | Grounded in a coherent product; the PRs read like real code with real smells. "Representative" framing now honest. |
| Leakage resistance | **B−** | Planted bugs + fixed "expected findings" leak with reuse; rotate variants and refresh PRs periodically. |
| Interviewer dependency | **B** | High ceiling *if* the interviewer drives the follow-ups and holds calibration; mediocre in untrained hands. |
| Interconnection design | **A** | The standout. Part 2 inherits Part 1's bugs; this is hard to fake and a great senior signal. |
| Time efficiency of signal | **B** | A lot of signal per 2 hours, but the per-section budgets are optimistic and most sessions overrun (1A/1B especially). |

## The two honest caveats

**1. High floor, weak bottom-end discrimination.** These kits are excellent at telling a strong senior-leaning engineer from a solid mid. They are *poor* at telling a solid-but-green mid from a junior, because a candidate who simply hasn't yet hit a read-modify-write race or internalized "the LLM is not a security boundary" can score Weak across all three parts — producing a flat, no-signal transcript rather than a differentiated read of *what* they can and can't do. Mitigation: lean on the Comms dimension and the follow-up trajectory (did they improve when nudged?) to recover signal from a candidate who's coachable but inexperienced.

**2. Background bias.** The kits reward candidates who've previously built financial-concurrency systems, multi-tenant data layers, and RAG/text-to-SQL pipelines. A genuinely strong full-stack+AI candidate whose depth is in, say, real-time frontend + model integration could under-score for reasons orthogonal to the role. Mitigation: pick the variant that matches the *job's* actual surface area, and discount dimensions that probe a specialty the role doesn't need. Don't run Variant E (financial correctness) on a candidate for a primarily product-frontend AI role and then ding them for not knowing outbox patterns.

## What the kits do unusually well

- **Interconnection.** Finding a bug in 1B that then defines the architecture in Part 2 (e.g. the tenant-filter gap → text-to-SQL safety; the broken tool→LLM loop → the agent loop they must design) is a strong, hard-to-game signal. Most kits treat the three parts as independent.
- **Severity framing as a discriminator.** Scoring "blocker vs. nit" rather than raw bug count is exactly the senior-vs-mid axis, and the rubric weights it.
- **Safety-as-deterministic-post-check** is the right and central AI-engineering signal, and it recurs across all five variants — a candidate who internalizes "the LLM proposes, the deterministic layer disposes" demonstrates the single most important instinct for this role.
- **Red/green flag lists** give even a less-experienced interviewer concrete things to listen for.

## Answer-key verification

Spot-checked all five PR keys against the code:

- **Variant A:** key was **incomplete** — the over-budget trim block is corrupt three ways (charges the untrimmed total; the in-memory cart sent to POS diverges from the trimmed DB cart). Now upgraded to a Blocker (#6). **Fixed.**
- **Variants B–E:** keys spot-check **clean and comprehensive**. A few "bonus bugs" a strong candidate may surface beyond the table (treat as upside, not gaps): B's allocation logic ignores `dietaryHeadcounts` entirely once the boolean gate trips (partially captured by #2); D's partial-assistant-message-on-error is noted (#6) but its corruption of *next-turn* context is worth probing.
- **Recommendation:** before first use of any variant, have a second engineer read the PR against its key once — a sharp candidate finding a real bug that's *not* in the table should earn credit, not confusion.

## Fixes already applied

- Variant C cost follow-up arithmetic (`$432/day` was off 1000×) → corrected to a consistent `~$450/day` framing.
- Variant E scale row (`~20/sec` was ~60× too high) → corrected to `~0.3/sec average, spiky at lunch`.
- "Real PR" → "representative PR" in A and B (the spoken framing now matches the README's synthetic-code disclosure).
- Variant A finding #6 upgraded from M to B with the full corruption write-up.

## Remaining recommendations (not yet applied)

1. **Calibration note at the top of each variant:** "OK-tier across all three parts is a hire at mid-level; Strong is the senior bar." (Captured in the rubric; consider echoing per-variant.)
2. **Treat per-section times as overrun-prone.** Expect to use the "if 1A overruns, cut 1B" escape hatch most sessions; consider splitting into two rounds if the loop allows.
3. **Rotate variants / refresh PRs** every few months to limit leakage.
4. **Match variant to role.** Use the README's "Best for hiring…" column deliberately; it's the main lever against the background-bias caveat.

## Bottom line

Grade: **A− as a senior-signal instrument, B as a mid-level instrument.** Ship them, run the scoring rubric, brief interviewers on the calibration anchor, and choose the variant by the role — and they'll produce defensible, well-differentiated hire decisions for the candidates who are actually near the bar.
