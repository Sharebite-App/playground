# Variant A — Group Ordering + AI Personalized Cart Suggester

> **Theme:** Group ordering system across Sharebite's three surfaces (employee app, corporate admin, backend POS). Extend with an AI cart-suggester per participant.
> **Skills tested:** Distributed correctness, state machines, real-time UX, RAG + structured output, allergen safety as a hard post-check.

---

## Pre-interview framing (read to candidate, ~2 min)

> Sharebite is a corporate meal-delivery platform. Companies give employees a daily meal allowance to order from partner restaurants. Employees order individually, in **group orders** (one host, many participants, single delivery), or for catering events. Restaurants receive orders through POS integrations (Chowly, Sweetgreen, fax-to-kitchen).
>
> Today you'll work on the group-order feature. Part 1 is system design plus a PR review of an existing piece of this system. Part 2, you'll evolve the design to add AI-powered cart recommendations. Think out loud — I care more about how you reason than about reaching a "correct" answer.

## Skill profile this variant tests

- Designing a multi-actor state machine with cutoffs and external integration
- Concurrency control on financial state (budgets / allowances)
- Idempotency and retry safety for POS submission
- Real-time fan-out for collaborative cart state
- Building AI features that integrate cleanly with deterministic safety layers
- Allergen / budget safety as a hard post-check (not LLM-enforced)

---

## PART 1 — System Design + PR Review (60 min)

### Part 1A — System Design (30–40 min)

**Prompt:**
> Design the **group ordering** system. A host creates a group order for their team at a single restaurant, invites coworkers via a shareable link, each participant builds their own cart by a cutoff time, and at cutoff the consolidated order is submitted to the restaurant's POS for a single delivery.
>
> **Constraints:**
> - 5–50 participants per group order
> - Per-participant budget set by the corporate admin (e.g., $25/person, soft or hard cap)
> - Restaurant needs ≥60 min lead time before delivery
> - Group orders can be one-time **or** recurring weekly
> - Peak load: ~10k concurrent active group orders during the 11:30am–1:00pm lunch window
> - Single-region for now, but corporate tenants are isolated

**Rubric — score each Weak / OK / Strong:**

| Area | What "Strong" looks like |
|---|---|
| Data model | `GroupOrder`, `Participant`, `CartItem`, `RestaurantWindow`. Clear FK to `Corporate` + `AllowanceGroup`. Recurrence stored as schedule, not duplicated rows. |
| State machine | Explicit states (DRAFT → OPEN → CUTOFF → SUBMITTED → FULFILLED / CANCELED) with documented allowed transitions and who can trigger each. |
| Cutoff enforcement | Doesn't naively rely on cron-per-order. Discusses scheduler (recurring sweeper job, or delayed queue like SQS / Redis ZSET) and **idempotency** if a cutoff fires twice. |
| Budget enforcement | Decides *when* to check — at add-to-cart (optimistic UX) vs. at finalize (authoritative). Acknowledges race condition; proposes solution (row-level lock / atomic decrement / unique constraint). |
| Real-time updates | WebSocket / SSE for participant join + cart updates. Discusses fan-out, reconnect, and what state is server-authoritative. |
| POS submission | Async, retried, **idempotent** (idempotency key per group order). Handles partial failure (POS accepts some items, not all). Mentions circuit breaker / DLQ. |
| Failure modes | Host cancels mid-flight, POS down at cutoff (queue and retry vs. fail), restaurant rejects, participant's payment fails. |
| Recurrence | Where does the weekly schedule live? What generates next week's instance? What if last Tuesday's job didn't fire — catch-up vs. skip? |
| Multi-tenancy | Corporate isolation in the data model and at the query layer. Doesn't propose row-level filtering as an afterthought. |

**Decision-forcing follow-ups (use 2–3):**

1. *"Two participants both add a $10 item simultaneously when only $15 of the group's $1000 budget remains, and the group budget is hard-capped. Walk me through exactly what happens in your design."*
2. *"The recurring weekly group order — where does the schedule live? What if the scheduler was down last Tuesday at 11am?"*
3. *"Restaurant POS is down at the cutoff time. What does the host see? What does the kitchen see when POS comes back up 20 min later?"*
4. *"How do you keep the participant list in sync across everyone's open browser tabs?"*

**Time gate:** Move on at 40 min even if the design is incomplete. Note coverage.

---

### Part 1B — PR Review (20–30 min)

**Setup (read to candidate):**
> Here's a representative PR from a teammate implementing the cutoff/finalization path you just designed. Review it as if it's in your queue. Tell me what you'd ask for changes on, what's a blocker vs. a nit, and anything you'd want to discuss before approving. ~15–20 min to read and react.

**The PR:**

```typescript
// finalizeGroupOrder.ts
// PR #4827: Finalize a group order at cutoff and submit to POS
// Reviewer: please take a look — passes existing tests

import { db } from "../db";
import { posClient } from "../integrations/pos";
import { logger } from "../logger";

const CHARITY_BY_STATE: Record<string, string> = {
  "New York": "city-harvest",
  "California": "food-forward",
};

export async function finalizeGroupOrder(groupOrderId: string) {
  const go = await db.groupOrder.findUnique({
    where: { id: groupOrderId },
    include: { participants: { include: { cartItems: true } }, settings: true },
  });

  if (!go) throw new Error("not found");
  if (go.status !== "OPEN") {
    logger.info(`skipping ${groupOrderId}, status=${go.status}`);
    return;
  }

  // 1. Compute totals per participant
  const participantTotals = go.participants.map((p) => {
    const subtotal = p.cartItems.reduce((s, i) => s + i.price * i.qty, 0);
    const tax = subtotal * 0.08875; // NY tax
    const tip = subtotal * 0.15;
    return { participantId: p.id, subtotal, tax, tip, total: subtotal + tax + tip };
  });

  // 2. Charge each participant's allowance
  for (const pt of participantTotals) {
    const allowance = await db.allowance.findFirst({
      where: { userId: pt.participantId, corporateId: go.corporateId },
    });
    if (allowance.remaining < pt.total) {
      logger.warn(`participant ${pt.participantId} over budget`);
      // trim the cart to fit budget
      const items = await db.cartItem.findMany({
        where: { participantId: pt.participantId, groupOrderId },
        orderBy: { price: "desc" },
      });
      let running = pt.total;
      for (const item of items) {
        if (running <= allowance.remaining) break;
        await db.cartItem.delete({ where: { id: item.id } });
        running -= item.price * item.qty;
      }
    }
    await db.allowance.update({
      where: { id: allowance.id },
      data: { remaining: allowance.remaining - pt.total },
    });
  }

  // 3. Build POS payload and submit
  const charityId = CHARITY_BY_STATE[go.settings.state];
  const posPayload = {
    restaurantId: go.restaurantId,
    items: go.participants.flatMap((p) => p.cartItems),
    charityId,
    deliverAt: go.settings.deliveryDatetime,
  };

  const posResponse = await posClient.submit(posPayload);

  // 4. Mark group order submitted
  await db.groupOrder.update({
    where: { id: groupOrderId },
    data: {
      status: "SUBMITTED",
      posOrderId: posResponse.id,
      submittedAt: new Date(),
    },
  });

  // 5. Notify participants
  for (const p of go.participants) {
    await sendEmail(p.email, "Your group order has been placed!", posResponse);
  }

  return posResponse;
}

async function sendEmail(to: string, subject: string, body: any) {
  // ... omitted
}
```

**Expected findings (B = blocker, M = major, N = nit):**

| # | Finding | Severity |
|---|---|---|
| 1 | **No transaction / no locking around the allowance read-modify-write** (lines ~35–53). Two concurrent finalizers, or any concurrent single-order checkout, will double-spend the allowance. Needs a DB transaction with row lock, or atomic update with a `WHERE remaining >= total` predicate. | **B** |
| 2 | **`allowance` may be `null`** — `findFirst` can return null; the deref will throw and leave the GroupOrder in OPEN with some allowances already decremented. No partial-rollback. | **B** |
| 3 | **No idempotency** — if this function retries (queue redelivery, timeout), allowances get decremented twice and POS gets submitted twice. Needs an idempotency key + a state check inside the transaction. | **B** |
| 4 | **Status transition is not guarded inside a transaction** — between the early `status !== "OPEN"` check and the final update, another worker could also be finalizing. Needs `UPDATE ... WHERE status = 'OPEN'` returning rowcount, or `SELECT FOR UPDATE`. | **B** |
| 5 | **POS failure handling is missing** — if `posClient.submit` throws after allowances were decremented, the group order is inconsistent and allowances are lost. Submit *before* decrementing, or use a saga with compensating actions; POS call needs retry + DLQ. | **B** |
| 6 | **The over-budget trim block is corrupt three ways** (the `if (allowance.remaining < pt.total)` branch). (a) After deleting items it still decrements the allowance by the **full, untrimmed `pt.total`** (line ~52) — the participant is charged for items that were removed. (b) The POS payload is built from the **in-memory `go.participants` object loaded before the deletes**, so POS receives the *un-trimmed* cart (and the allowance is charged the un-trimmed total, per (a)) while the DB now holds the *trimmed* cart — the persisted cart no longer matches what was actually ordered and charged. (c) Silently deleting a participant's chosen items is user-hostile — enforce the budget at add-to-cart so this branch is unreachable, or surface the trim to the user. Any one of (a)/(b) is a data-corruption / financial blocker. | **B** |
| 7 | **Hardcoded tax (8.875%) and tip (15%)** — should come from restaurant config / participant choice. | **M** |
| 8 | **`CHARITY_BY_STATE` is a hardcoded map** — unmaintainable, breaks silently for unmapped states (`charityId = undefined` flows to POS payload). | **M** |
| 9 | **N+1 query** — `findFirst` per participant in the loop. Should be a single `IN` query. | **M** |
| 10 | **Email sent in a serial loop** holding the request — should be queued. | **M** |
| 11 | **No structured logging / no correlation ID** — string logs won't help debug a production incident across this distributed flow. | **N** |
| 12 | **`posResponse` forwarded into the email body** — may contain internal POS metadata that shouldn't leak to users. | **N** |
| 13 | No unit tests visible for the over-budget branch or partial-failure paths. | **M** |

**Rubric guidance:**

- **Strong:** raises ≥3 of the blockers (B1–B6) unprompted — bonus if they catch the trim-block corruption (#6, especially that POS still gets the un-trimmed cart); frames them as blockers, not nits; suggests concrete fixes.
- **OK:** spots the race (#1) and missing error handling (#5) but misses idempotency (#3).
- **Weak:** focuses on M/N issues (tax %, hardcoded charity) and misses the data-corruption bugs.

**Connection-forcing prompt (use to bridge to Part 2):**
> *"This PR also bakes in the assumption that participants built their own carts. In Part 2 we're going to have an AI build carts on the participants' behalf. Hold onto your critiques — we'll come back to them."*

---

## PART 2 — AI Engineering (60 min)

**Prompt:**
> Now we're going to evolve the system you just designed. When the host creates a group order, instead of every participant having to build their own cart, the system should **suggest a personalized cart per participant** at the chosen restaurant. The host can also chat with an AI assistant to bulk-adjust ("we have 3 vegans coming", "no fried food", "swap all the burgers for something lighter"), and each participant can accept, edit, or rebuild their suggested cart before the cutoff.
>
> **Inputs available:**
> - Each participant's **flavor profile** (preferred cuisines, dislikes, dietary restrictions, allergens)
> - Each participant's **past order history** (~30 orders)
> - The **restaurant's menu** (items with name, description, price, tags, allergens) — 50–300 items
> - Per-participant budget
> - Group-level constraints from the host (cuisine theme, max spend, dietary inclusivity targets)
>
> Design this AI feature end-to-end — architecture, model choice, prompting, integration with Part 1's group-order system, evaluation, cost, safety.

**Rubric:**

| Area | What "Strong" looks like |
|---|---|
| Architecture | New service that the group-order flow calls. Cleanly bolts on — doesn't change the state machine, just adds a `RECOMMENDATIONS_PENDING` substate or async-fills carts before cutoff. |
| Model choice | Articulates trade-off: pure LLM with menu in context vs. embeddings + reranker + small LLM. Lands on hybrid for cost. Knows when to use a small model vs. a frontier one. |
| Retrieval / context | Pre-filters menu by dietary restrictions, then top-K by embedding similarity to flavor profile, then ~15–30 items to the LLM. Menus embedded offline, not per request. |
| Prompt structure | System prompt with role + constraints + JSON schema. Uses structured output / function calling / JSON mode. Clear failure handling for malformed output. |
| Batch vs. per-participant | Recognizes 50 participants × LLM call is expensive. Proposes batching ("generate carts for these 10 in one call") or grouping similar profiles. |
| Chat assistant | Designs an **agent** with **tools**: `get_menu`, `propose_cart_for_participant`, `replace_items_matching`, `check_budget`, `apply_to_all`. Discusses conversation state, tool-call loop, max-turns guardrail. |
| Latency / streaming | Host expects suggestions in seconds. Streams partial results. Acknowledges 50 carts isn't a sync request — kicks off a job, shows progress. |
| Cost | Has rough math: input tokens × N participants × group orders/month. Discusses prompt caching for the menu, semantic caching for repeated chat asks, smaller models for easy cases. |
| Safety / guardrails | **Allergen safety is the killer case.** Doesn't trust the LLM to enforce — validates output items against menu's structured allergen field as a hard post-check. Same for budget and "item exists" (no hallucinated items). |
| Evaluation | Acceptance rate, edit distance, allergen-violation rate (~0), p95 latency, cost per group order. Distinguishes offline eval from online A/B. |
| Fallback | AI service down/slow → fall back to existing rule-based engine. Group-order flow not blocked by AI. |
| Personalization loop | Participant edits feed back into flavor profile / preference embedding. |

**Decision-forcing follow-ups:**

1. *"Your model recommends 'Spicy Tuna Roll' but the restaurant's menu only has 'Spicy Tuna Hand Roll' — a different SKU. How do you prevent shipping a nonexistent item to POS?"*
2. *"A participant has a peanut allergy in their profile. The LLM picks an item whose description doesn't mention peanuts, but the menu's structured `allergens` field includes peanuts. Walk me through how your system catches this. Is the LLM the right place to enforce it?"*
3. *"You launch. Acceptance rate is 30% — people heavily edit suggested carts. What do you do? What signals do you instrument?"*
4. *"PM says your $0.05-per-group-order LLM cost projects to $5k/month. Get it under $1k. What levers do you pull, in priority order?"*
5. *"Host says 'replace all the burgers with healthier options.' Walk me through the tool calls the agent makes. What's the state at each step? What if the user then says 'undo'?"*
6. **(Tie-back to 1B)** *"Remember the budget race in the PR you reviewed? Does the AI suggester make it worse, better, or the same?"*
7. **(Tie-back to 1A)** *"Where in the group-order state machine does the AI suggestion fit? Does it change your cutoff logic at all?"*

**Red flags:**
- Putting allergen / budget enforcement *inside the prompt* and trusting it.
- "Just call OpenAI with the menu" — no retrieval, no caching, no batching.
- No mention of function calling / tools for the chat assistant.
- Calling the LLM synchronously inside group-order creation.
- No evaluation plan beyond "we'll look at user feedback."
- Vague hallucination handling ("we'll prompt-engineer it").

**Green flags:**
- Distinguishes batch recommendation from interactive chat agent — treats them as different problems sharing infra.
- Names the validation step: "the LLM proposes, the deterministic layer disposes."
- Mentions prompt caching of the menu when calling per participant.
- Proposes an eval set up front, before launching.

---

## Interconnection summary

| Part 1 element | Part 2 reuses / extends |
|---|---|
| Group-order state machine | AI suggestions plug in as a pre-cutoff step; states unchanged |
| Per-participant budget enforcement | Becomes a **hard post-check** on LLM output |
| Cutoff scheduler | Also triggers fallback to rule-based engine if AI hasn't returned |
| Real-time updates | Streams AI-generated carts to participants as they're produced |
| PR finding #1 (race) | Re-surfaces — AI can't fix it; deterministic locking still required |
| PR finding #5 (POS failure) | AI doesn't change POS submission; group-order finalization is the integration point |

---

## Time management

| Phase | Target | Hard cap |
|---|---|---|
| Part 1A system design | 35 min | 40 min |
| Part 1B PR review | 20 min | 25 min |
| Buffer / wrap | 5 min | — |
| Part 2 AI design | 50 min | 55 min |
| Candidate Q&A | 5 min | — |

If Part 1A overruns, shorten Part 1B to 15 min and ask the candidate to focus on blockers only. **Do not sacrifice Part 2** — it's the differentiating signal for an AI engineer hire.
