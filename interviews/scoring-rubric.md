# Consolidated Scoring Rubric — Mid-Level Full-Stack AI Engineer

One scorecard for **all five variants** (A–E). They share the same three-part shape, so the same dimensions, weights, and bands apply regardless of which theme you ran. Use the variant file's per-area tables for the *detailed* "what Strong looks like" language; use this file to **turn those observations into a defensible number and a hire recommendation**.

> **Calibration anchor — read this first.** This is a *mid-level* bar. A candidate who is **"OK / at-bar" across the board is a HIRE**, not a borderline. "Strong" is the senior bar — treat it as upside, not the pass line. Do **not** reject a good mid candidate for failing to name reciprocal-rank-fusion or design a saga unprompted. The most common scoring error on these kits is an interviewer anchoring on the "Strong" column and under-rating solid mid performance.

---

## 1. The scale (per dimension)

Score every dimension on a 0–3 scale. The kit's Weak/OK/Strong language maps directly:

| Score | Label | Meaning |
|---|---|---|
| **0** | No signal | Didn't reach the topic, or was actively wrong and didn't recover. |
| **1** | Weak | Touched it but shallow, hand-wavy, or needed heavy prompting to get anywhere. |
| **2** | OK / at-bar | Solid, correct, mid-level-competent. Got there, maybe with one nudge. **This is a passing score.** |
| **3** | Strong | Senior-flavored: unprompted, names the trade-off, proposes the right pattern, anticipates the failure. |

Half-points (e.g. 2.5) are fine. Record a one-line evidence note next to each score — the note matters more than the digit at debrief.

---

## 2. Dimensions, by component

### Part 1A — System Design (weight **30%**)

| # | Dimension | 0–3 | What "2 / at-bar" looks like |
|---|---|---|---|
| 1A.1 | **Data modeling** | | Names the core entities and relationships; recurrence/schedule stored as data, not duplicated rows. |
| 1A.2 | **Concurrency correctness** | | Recognizes the read-modify-write race on shared financial/quantity state; proposes *a* real fix (lock, atomic update, constraint). |
| 1A.3 | **Idempotency & retry safety** | | Knows external calls / scheduled jobs can fire twice; puts a key somewhere sensible. |
| 1A.4 | **Failure-mode reasoning** | | Walks at least 2–3 of the named failure modes (dependency down, partial failure, cancel mid-flight) with a concrete behavior. |
| 1A.5 | **Multi-tenancy / isolation** | | Tenant scope is in the data model and query layer, not bolted on as a post-filter. |
| 1A.6 | **Scoping judgment** | | Picks a tractable design for the stated scale; doesn't over-engineer (no premature sharding) or under-engineer (no ignoring the hard constraint). |

### Part 1B — PR Review (weight **25%**)

| # | Dimension | 0–3 | What "2 / at-bar" looks like |
|---|---|---|---|
| 1B.1 | **Blocker detection** | | Finds ≥2 of the true data-corruption/security blockers (B-tier) for that variant, even if a couple needed a nudge. |
| 1B.2 | **Severity framing** | | Distinguishes blocker from nit instead of listing everything flat. *This is the senior-vs-mid discriminator — weight it.* |
| 1B.3 | **Fix quality** | | Proposed remedies are concrete and actually correct (e.g. atomic `WHERE` predicate, not "add a mutex"). |
| 1B.4 | **Review craft** | | Would deliver the review constructively; asks a clarifying question rather than assuming; prioritizes what to block on. |

### Part 2 — AI Engineering (weight **35%** — the differentiating signal)

| # | Dimension | 0–3 | What "2 / at-bar" looks like |
|---|---|---|---|
| 2.1 | **Architecture / decomposition** | | Breaks the feature into stages (understand → retrieve → generate → validate); the AI bolts onto Part 1 without rewriting the state machine. |
| 2.2 | **Retrieval / context strategy** *(A,B,C,D)* | | Pre-filters/retrieves instead of dumping everything into the prompt; embeddings done offline. (For E, score *schema-scoping* here instead.) |
| 2.3 | **Safety & guardrails** | | **The hard post-check.** Allergen / budget / tenant / write-protection enforced *deterministically outside the LLM*, not by trusting the prompt. *See gate G1.* |
| 2.4 | **Evaluation discipline** | | Proposes an offline eval set with real metrics (acceptance/edit rate, recall@k, allergen-violation≈0, refusal precision) *before* "we'll watch the dashboard." |
| 2.5 | **Cost & latency reasoning** | | Does rough token math; names ≥2 real levers (caching, model-tier, batching, top-K limits) in priority order. |
| 2.6 | **Fallback / degradation** | | The product still works when the AI is down/slow; AI is never a hard dependency on the critical path. |

### Cross-cutting — Communication & Collaboration (weight **10%**)

| # | Dimension | 0–3 | What "2 / at-bar" looks like |
|---|---|---|---|
| C.1 | **Structured reasoning** | | Thinks out loud, states assumptions, organizes the answer rather than free-associating. |
| C.2 | **Response to pushback** | | Handles the decision-forcing follow-ups: updates the design under new constraints without getting defensive or collapsing. |

---

## 3. Red-flag gates (these CAP the score)

Some misses are disqualifying for *this specific role* regardless of how strong the rest was. If a gate trips, the component cannot exceed the listed ceiling even if individual dimensions scored higher.

| Gate | Trigger | Effect |
|---|---|---|
| **G1 — LLM as safety boundary** | Enforces allergens / budget / tenant isolation / write-protection *inside the prompt* and trusts it, and **does not self-correct when probed**. | Part 2 capped at **No Hire** (composite Part 2 ≤ 1.0). This is the single most important signal for an AI-engineer hire. |
| **G2 — No evaluation, at all** | Cannot propose *any* way to know if the AI feature is good, even after the eval follow-up. | Dimension 2.4 = 0 and Part 2 capped at 1.5. |
| **G3 — Blind to data corruption** | In 1B, misses *every* blocker even after the connection-forcing prompt points at the area. | Part 1B capped at **Weak** (≤ 1.0). |
| **G4 — Ships hallucinated actions** | Would send LLM-proposed items/SQL/orders to a downstream system with no "does this exist / is this valid" check. | Caps 2.3 at 1. |

A tripped gate is **not** an automatic overall no-hire on its own (except G1, which usually is for this role) — but it must be called out explicitly in the debrief writeup.

---

## 4. Rolling it up

1. **Component score** = average of that component's dimension scores (0–3), after applying any gate ceilings.
2. **Composite** = weighted average:

   ```
   Composite = 0.30·(Part 1A) + 0.25·(Part 1B) + 0.35·(Part 2) + 0.10·(Comms)
   ```

3. **Map composite → recommendation:**

| Composite | Recommendation | Reading |
|---|---|---|
| **≥ 2.6** | **Strong Hire** | Strong across most dimensions; senior-leaning. |
| **2.0 – 2.59** | **Hire** | Solidly at-bar (straight 2s land here) up through several Strong spikes. The expected profile for a good mid hire. |
| **1.7 – 1.99** | **Lean Hire / Borderline** | A notch below at-bar — one or two Weak dimensions dragging an otherwise-OK read. Use the debrief and other loops to break the tie. |
| **1.2 – 1.69** | **No Hire** | Multiple Weak dimensions or a tripped gate; gaps outweigh strengths. |
| **< 1.2** | **Strong No Hire** | Weak/absent across components, or G1 tripped. |

> **Sanity check the math against the calibration anchor:** straight 2s ("OK everywhere") = composite **2.0 → Hire**. Straight 3s = **3.0 → Strong Hire**. That's intentional — at mid-level, consistently at-bar *is* a hire.

---

## 5. Scorecard (copy per candidate)

```
Candidate: ______________________   Variant: A / B / C / D / E   Interviewer: __________   Date: ______

PART 1A — System Design (×0.30)
  1A.1 Data modeling            [ ]  note:
  1A.2 Concurrency correctness  [ ]  note:
  1A.3 Idempotency/retry        [ ]  note:
  1A.4 Failure-mode reasoning   [ ]  note:
  1A.5 Multi-tenancy            [ ]  note:
  1A.6 Scoping judgment         [ ]  note:
  → Part 1A avg: ____

PART 1B — PR Review (×0.25)
  1B.1 Blocker detection        [ ]  blockers found: ______________________
  1B.2 Severity framing         [ ]  note:
  1B.3 Fix quality              [ ]  note:
  1B.4 Review craft             [ ]  note:
  → Part 1B avg: ____

PART 2 — AI Engineering (×0.35)
  2.1 Architecture              [ ]  note:
  2.2 Retrieval/schema-scoping  [ ]  note:
  2.3 Safety & guardrails       [ ]  note:
  2.4 Evaluation discipline     [ ]  note:
  2.5 Cost & latency            [ ]  note:
  2.6 Fallback/degradation      [ ]  note:
  → Part 2 avg: ____

COMMS (×0.10)
  C.1 Structured reasoning      [ ]  note:
  C.2 Response to pushback      [ ]  note:
  → Comms avg: ____

GATES TRIPPED:  G1 [ ]  G2 [ ]  G3 [ ]  G4 [ ]   (explain below)

COMPOSITE = 0.30·___ + 0.25·___ + 0.35·___ + 0.10·___ = ______
RECOMMENDATION:  Strong Hire / Hire / Lean Hire / No Hire / Strong No Hire

Top 2 strengths:
Top 2 concerns:
Would they raise the bar for this team?  Y / N
```

---

## 6. Notes on using this fairly

- **Score what they showed, not what they didn't reach.** If you ran out of time before Part 2 retrieval, that's a 0-weighting-of-time problem, not a candidate weakness — note "not covered" rather than scoring 0.
- **One nudge is fine; carrying them is not.** A "2" can include a single clarifying prompt. If you had to walk them to the answer step by step, it's a "1."
- **The follow-ups are part of the score, not extra credit.** The decision-forcing probes in each variant are where Strong separates from OK — a candidate who only shines until the first "but what if…" is an OK, not a Strong.
- **Debrief writeup > the number.** The composite exists to force consistency and prevent gut-feel hires/rejects. If your number and your gut disagree, write down *why* — that note is the most useful artifact for the hiring committee.
