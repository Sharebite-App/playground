# Variant B — Catering Event Planner + AI Multi-Step Catering Wizard

> **Theme:** Catering event planning for corporate offices — multi-restaurant, dietary-mix-aware, budget-constrained. Extend with an AI agent that proposes a complete plan from a natural-language brief.
> **Skills tested:** Constraint modeling, scheduling, multi-vendor coordination, planner-solver hybrid AI design, explaining trade-offs in NL.

---

## Pre-interview framing (read to candidate, ~2 min)

> Sharebite runs the lunch program at a few thousand corporate offices. Beyond daily ordering, customers run **catering events** — all-hands lunches, client meetings, recurring team lunches. A corporate admin picks the restaurants, headcount, dietary mix, and budget; the system books with the restaurants, gets it delivered, and reconciles invoices against attendance.
>
> Today you'll design the catering event planner. Part 1 is system design plus a PR review of an existing piece. Part 2, you'll evolve the design into an AI catering wizard that takes a brief and proposes a complete plan. Think out loud — reasoning matters more than reaching a "correct" answer.

## Skill profile this variant tests

- Modeling a multi-vendor scheduling problem with constraints (lead time, headcount, budget, dietary coverage)
- Designing for **plan revision** — admins iterate on plans before they commit
- Reconciliation with reality (no-shows, late RSVPs) against pre-booked orders
- Building an AI agent that interleaves an LLM proposer with a deterministic solver
- Handling the constraint-satisfaction problem cleanly: which constraints are hard, which are soft, what's the objective

---

## PART 1 — System Design + PR Review (60 min)

### Part 1A — System Design (30–40 min)

**Prompt:**
> Design the **catering event planner**. A corporate admin creates an event:
> > *"All-hands lunch, Tuesday June 3rd 12pm, 75 people, $20/person, dietary mix: 60% omnivore, 25% vegetarian, 10% vegan, 5% gluten-free, no nut allergens."*
>
> The system: lets them pick one or more restaurants, builds a shopping list that meets the headcount + dietary mix within budget, locks restaurants in 24h before, generates a delivery + packing plan, tracks RSVP/attendance, and reconciles actuals (no-shows) against the invoice.

**Constraints to probe:**
- Multi-restaurant splits (one restaurant rarely covers all dietary categories well)
- Lead-time deadlines per vendor (each restaurant has its own minimum, e.g., 24h–7d)
- RSVP cutoff vs. order cutoff (do you over-order? short-order?)
- Per-event vs. per-person budget reconciliation
- Recurring events (weekly Tuesday lunches) — schedule storage, "cancel one instance" vs. cancel series
- Holiday calendar interactions (skip July 4th)
- Concur / Salesforce expense integration for billing

**Rubric — score each Weak / OK / Strong:**

| Area | What "Strong" looks like |
|---|---|
| Data model | `CateringEvent`, `EventLineItem`, `Restaurant`, `RSVP`, `Attendance`, `RecurrenceRule`. Clean separation of *the plan* vs. *the actuals*. |
| Constraint modeling | Distinguishes **hard** constraints (lead time, allergens, budget cap) from **soft** (variety, cuisine preference). Discusses objective function: minimize cost? maximize variety? hit dietary mix? |
| Multi-restaurant allocation | Knows this is a bin-packing-like problem. Proposes a tractable approach (greedy heuristic, ILP for small sizes, manual override). Doesn't pretend it's trivial. |
| Lead-time enforcement | Per-restaurant minimums respected. Discusses what happens when admin tries to book inside the lead window (reject? warn? auto-pick available restaurants?). |
| RSVP vs. order quantity | Decides on a policy: order to confirmed RSVPs, +X% buffer, or fixed headcount. Justifies the trade-off (food waste vs. running out). |
| Recurrence | Schedule as data (RRULE-like), not duplicated events. Generation of next instance. Holiday calendar respected. Cancel-one vs. cancel-series. |
| Reconciliation | No-shows tracked. Final invoice vs. projected cost. Refund/credit flow when restaurants over-deliver. Audit trail. |
| Multi-tenancy | Corporate isolation. Admin permissions (who can create events, who can approve over-budget). |
| Failure modes | Restaurant cancels day-of. RSVP system has an outage. Admin double-books two events. Partial delivery (one restaurant shows, the other doesn't). |
| Scale | Hundreds of corporates running thousands of events/week; admin dashboard must list/filter quickly. |

**Decision-forcing follow-ups:**

1. *"60% omnivore / 25% vegetarian / 10% vegan / 5% GF on 75 people. The first restaurant you'd pick has great omnivore items but only 2 vegan dishes. Walk me through how you decide whether to split between two restaurants or accept that vegans get repetitive options."*
2. *"It's 11am Tuesday, the event is at noon, and the BBQ restaurant just emailed they're closed today (kitchen fire). You have one hour. What does the system do? What does the admin see?"*
3. *"The corporate admin wants to set up a 'Lunch every Tuesday at noon for the engineering team' recurring event. Where does that schedule live, and what happens the week of the company offsite when most of engineering is out?"*
4. *"Headcount said 75. Only 60 people showed up. Restaurant invoice says $1,800. How does the system reconcile, and what does the corporate admin's monthly invoice look like?"*

**Time gate:** Move on at 40 min. Note coverage.

---

### Part 1B — PR Review (20–30 min)

**Setup:**
> Here's a representative PR implementing event creation with multi-restaurant allocation. Review it as if it's in your queue.

**The PR:**

```typescript
// createCateringEvent.ts
// PR #5102: Create a catering event with multi-restaurant order plan
// Reviewer: please take a look — works in my testing

import { db } from "../db";
import { restaurantClient } from "../integrations/restaurant";
import { logger } from "../logger";

interface CreateEventInput {
  corporateId: string;
  eventDate: string;                  // "2026-06-03T12:00"
  headcount: number;
  budgetPerPerson: number;            // dollars
  dietaryMix: { vegetarian: number; vegan: number; glutenFree: number };  // fractions
  restaurantIds: string[];
}

const PORTION_PER_PERSON = 1.2;       // entree multiplier
const TAX_RATE = 0.08875;

export async function createCateringEvent(input: CreateEventInput) {
  const event = await db.cateringEvent.create({
    data: {
      corporateId: input.corporateId,
      scheduledFor: new Date(input.eventDate),
      headcount: input.headcount,
      budgetCents: input.budgetPerPerson * input.headcount * 100,
      status: "DRAFT",
    },
  });

  // Compute per-category headcount from dietary mix
  const dietaryHeadcounts = {
    vegetarian: Math.round(input.headcount * input.dietaryMix.vegetarian),
    vegan: Math.round(input.headcount * input.dietaryMix.vegan),
    glutenFree: Math.round(input.headcount * input.dietaryMix.glutenFree),
  };

  // Pull menus from each restaurant
  const allMenus = [];
  for (const restaurantId of input.restaurantIds) {
    const menu = await restaurantClient.getMenu(restaurantId);
    allMenus.push({ restaurantId, menu });
  }

  // Allocate items across restaurants
  const lineItems = [];
  let budgetRemaining = input.budgetPerPerson * input.headcount;

  for (const { restaurantId, menu } of allMenus) {
    const portions = Math.floor(input.headcount * PORTION_PER_PERSON / input.restaurantIds.length);

    // Pick items matching dietary needs
    const items = menu.items.filter((i: any) => {
      if (dietaryHeadcounts.vegan > 0) return i.tags.includes("vegan");
      if (dietaryHeadcounts.vegetarian > 0) return i.tags.includes("vegetarian");
      return true;
    });

    const chosen = items.slice(0, portions);
    for (const item of chosen) {
      const lineTotal = item.price;
      lineItems.push({
        eventId: event.id,
        restaurantId,
        itemId: item.id,
        itemName: item.name,
        qty: 1,
        priceCents: item.price * 100,
      });
      budgetRemaining -= lineTotal;
    }
  }

  // Save line items
  for (const li of lineItems) {
    await db.cateringEventLineItem.create({ data: li });
  }

  // Compute total with tax
  const subtotal = lineItems.reduce((s, li) => s + li.priceCents, 0) / 100;
  const total = subtotal + subtotal * TAX_RATE;

  // Verify lead time
  const leadTimeHours = (new Date(input.eventDate).getTime() - Date.now()) / 3_600_000;
  if (leadTimeHours < 24) {
    logger.warn(`event ${event.id} has only ${leadTimeHours}h lead time`);
  }

  await db.cateringEvent.update({
    where: { id: event.id },
    data: { totalCents: Math.round(total * 100), status: "PENDING_APPROVAL" },
  });

  return event;
}
```

**Expected findings:**

| # | Finding | Severity |
|---|---|---|
| 1 | **No transaction across event creation + line items + total update.** A crash mid-loop leaves the DB with a half-built event. Wrap in a tx, or build line items first and create everything atomically. | **B** |
| 2 | **Dietary allocation logic is broken** — the `if/else` chain means once `dietaryHeadcounts.vegan > 0`, only vegan items are ever chosen for *every* restaurant, regardless of vegetarian/GF needs. Vegetarian and GF coverage never reached. Doesn't actually satisfy the dietary mix the system design requires. | **B** |
| 3 | **`new Date("2026-06-03T12:00")` is parsed in the server's local timezone.** A NY admin booking 12pm event creates an event at 12pm UTC — restaurant arrives at the wrong time. Needs explicit timezone (corporate's timezone). | **B** |
| 4 | **No idempotency.** Admin double-clicks "Create" → duplicate events, duplicate orders, double-billed. Needs an idempotency key or DB-level uniqueness on (corporateId, eventDate, restaurantIds). | **B** |
| 5 | **Budget enforcement is decorative.** `budgetRemaining` is decremented but never *checked* — items are added regardless of cost. The system design specified a hard budget cap. | **B** |
| 6 | **Lead-time only warns, doesn't reject** — `leadTimeHours < 24` writes a warning but proceeds. Per the constraints this should be hard-rejected (or pre-validated against each restaurant's minimum, not a global 24h). | **M** |
| 7 | **Sequential menu fetches** — `for` loop awaiting each `restaurantClient.getMenu`. Should be `Promise.all` with bounded concurrency. | **M** |
| 8 | **Sequential `lineItem` inserts** — N+1 writes per event. Use `createMany`. | **M** |
| 9 | **Floating-point money math** — `item.price * 100` assumes price is dollars in a JS number. Drift creeps in via `subtotal * TAX_RATE`. Use cents end-to-end or a decimal library. | **M** |
| 10 | **`Math.round(input.headcount * input.dietaryMix.vegan)`** — if mix is fractions, rounded sum can ≠ headcount (e.g., 75 × 0.25 = 18.75 → 19, but vegan+veg+GF roundings may overcount or undercount). No invariant check. | **M** |
| 11 | **`PORTION_PER_PERSON = 1.2` and `TAX_RATE = 0.08875`** hardcoded — should be configurable per restaurant or corporate. | **M** |
| 12 | **`items.slice(0, portions)`** — silent failure if menu has fewer items than requested portions. Just under-orders, no signal. | **M** |
| 13 | **No validation:** `restaurantIds` could be empty, headcount could be ≤ 0, budget could be negative, dietary mix fractions could sum > 1. | **M** |
| 14 | **`menu: any`** — type erasure; bypasses any guarantees the API gives. | **N** |
| 15 | **`logger.warn` for the lead-time issue is unstructured** — no correlation ID, no eventId in some logs. | **N** |
| 16 | **No tests for the dietary-allocation behavior or the lead-time branch.** | **M** |

**Rubric guidance:**
- **Strong:** spots ≥3 of B1–B5 unprompted, especially the broken dietary logic (#2) and the timezone bug (#3). Frames as blockers.
- **OK:** spots the dietary bug and the missing transaction, but misses the timezone trap.
- **Weak:** focuses on style/M-tier issues (hardcoded tax, type annotations) and misses the data-corruption bugs.

**Connection-forcing prompt:**
> *"In Part 2 we're going to replace this manual menu-picking with an AI agent that proposes the whole plan. Some of the bugs you found here — especially the dietary allocation logic — are the kind of thing the AI will also produce if you let it. Keep those in mind."*

---

## PART 2 — AI Engineering (60 min)

**Prompt:**
> Replace the manual restaurant/item-picking flow with an **AI catering wizard**. The corporate admin enters a free-text brief:
>
> > *"Lunch for 75 next Tuesday, $20/person, mix of vegetarian and vegan friendly, nothing fried, we have a peanut allergy, prefer Mediterranean and Asian. Avoid that one Thai place we used last week."*
>
> The agent proposes a complete plan (1–3 restaurants, item-by-item allocation, per-person portioning, total cost), explains its trade-offs in natural language ("I picked 2 restaurants because no single restaurant has enough vegan options"), and the admin can iterate ("less Mediterranean, more variety", "drop the dessert tier to fit budget", "swap restaurant B").

**Rubric:**

| Area | What "Strong" looks like |
|---|---|
| Brief parsing | LLM extracts structured constraints from NL (headcount, date, budget, dietary, allergens, cuisine preferences, exclusions). JSON output, validated. |
| Planner / solver architecture | **LLM proposes, deterministic solver disposes.** Agent picks candidate restaurants and items; a solver checks feasibility (dietary coverage, budget, lead time). On infeasibility, returns *why* to the LLM for revision. |
| Restaurant retrieval | Top-K restaurants by combination of distance, cuisine match (embedding), historical performance, dietary coverage. Not "feed all 50k restaurants to the LLM." |
| Item selection within restaurant | Either LLM picks N items from a top-K menu shortlist, or solver picks against an LLM-generated objective. Discusses both. |
| Constraint satisfaction | Hard constraints (allergens, lead time, budget cap) enforced **post-hoc** by deterministic check. Soft constraints (variety, cuisine) optimized by the LLM. |
| Iteration UX | Admin says "less Mediterranean" — system understands what to keep, what to swap. Conversation state. Diff view of old vs. new plan. |
| Explanation | Agent surfaces *why* it made trade-offs: "I exceeded $20/person by $0.40 because the only nut-free GF option costs more — increase budget or drop GF coverage?" |
| Cost | Per-event LLM cost matters. Discusses caching menu embeddings, reusing brief-parsing for revisions, batching item proposals. |
| Latency | Admin expects a plan in <30s. Streaming intermediate state (e.g., "considering 4 restaurants…" → "evaluating menus…" → final plan). |
| Safety | Allergen enforcement is a **hard post-check**, not LLM-trusted. Menu items validated against actual menu (no hallucinated items). Exclusions ("avoid that Thai place") respected. |
| Evaluation | Plan-acceptance rate, edits-per-plan, final-vs-proposed-cost gap, allergen violation rate (~0), constraint-satisfaction rate offline against a test set. |
| Fallback | If solver can't find a feasible plan, agent says so clearly and proposes which constraint to relax. Doesn't silently return a broken plan. |

**Decision-forcing follow-ups:**

1. *"The brief says 'no peanuts, severe allergy.' The agent picks a Thai place whose pad thai doesn't list peanuts in the description but the menu's structured allergens field includes them. Walk me through how your system catches this. Is the LLM the right enforcement layer?"*
2. *"You feed the menu of 3 restaurants × 200 items each = 600 items to the LLM. Costs add up. How do you cut tokens 5x without losing plan quality?"*
3. *"The admin says 'less Mediterranean.' Are you re-running the whole plan or surgically editing? What's the cost/UX trade-off?"*
4. *"The solver can't find a feasible plan — $20/person is too low for the dietary mix at the available restaurants. What does the agent say to the admin?"*
5. *"How do you eval this? You can't just run acceptance rate — admins might accept bad plans because they're lazy."*
6. **(Tie-back to 1B)** *"The PR you reviewed had a broken dietary-allocation loop. If you trust the LLM to do allocation instead, what's your defense against the same kind of bug?"*
7. **(Tie-back to 1A)** *"Where does the wizard sit in the event lifecycle you designed? Does it produce DRAFTs that go through the same approval path, or something new?"*

**Red flags:**
- Pure LLM end-to-end with no solver.
- Trusting LLM for allergen / budget enforcement.
- Treating revision as "re-prompt with the whole conversation."
- No eval plan.

**Green flags:**
- Names the planner-solver split early.
- Treats brief parsing, restaurant retrieval, item selection, and feasibility check as separate components with separate evals.
- Mentions constraint-satisfaction terminology (hard vs. soft, feasibility, objective).
- Proposes a "diff view" or structured revision so the admin trusts iteration.

---

## Interconnection summary

| Part 1 element | Part 2 reuses / extends |
|---|---|
| `CateringEvent` data model | AI wizard outputs the same data structures — DRAFT state, line items |
| Lead-time enforcement | Same hard post-check applied to AI-generated plans |
| Dietary allocation logic | Now a solver feasibility check on LLM proposals |
| RSVP / attendance reconciliation | Unchanged — AI doesn't reach into actuals |
| PR finding #2 (broken dietary loop) | The class of bug the solver-as-post-check defends against |
| PR finding #5 (decorative budget) | Becomes the *real* hard constraint the solver enforces |
| Recurrence | AI wizard can also generate recurring instances, using the same scheduler |

---

## Time management

| Phase | Target | Hard cap |
|---|---|---|
| Part 1A system design | 35 min | 40 min |
| Part 1B PR review | 20 min | 25 min |
| Buffer / wrap | 5 min | — |
| Part 2 AI design | 50 min | 55 min |
| Candidate Q&A | 5 min | — |

This variant runs slightly long in Part 1A — the constraint modeling discussion tends to expand. If it overruns, cut Part 1B to 15 min and ask the candidate to focus on the dietary-allocation and timezone bugs only.
