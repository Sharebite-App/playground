# RFC: Saved Favorites Feature

## Summary

Users currently have no way to save restaurants they order from frequently. Every time they want to reorder, they have to search again. This RFC proposes a lightweight "Favorites" feature that lets users heart a restaurant and view their saved list in a dedicated account tab.

---

## Motivation

From user feedback in our last sprint retro:

> "I order from the same 3 places every week. Why do I have to search every time?"

This is a quick win — no backend changes needed since we're using the existing mock API. All state can live in `localStorage` the same way the cart does.

---

## Requirements

### Functional

| # | Requirement |
|---|---|
| F-01 | A heart icon button appears on each restaurant card in the list view |
| F-02 | Clicking the heart toggles the restaurant as a favorite (filled = saved, outline = not saved) |
| F-03 | Favorites persist across page refreshes (stored in `localStorage`) |
| F-04 | A new "Favorites" tab appears in the Account section |
| F-05 | The Favorites tab lists all saved restaurants with photo, name, cuisine, rating, ETA, and delivery fee |
| F-06 | Each row in the Favorites list has an "Order" button that navigates to that restaurant's menu |
| F-07 | Users can search within their favorites by restaurant name |
| F-08 | Users can sort favorites by name (A–Z) or by rating (highest first) |
| F-09 | A "Clear All" action removes all favorites with a brief confirmation message |
| F-10 | The Favorites tab shows a count badge next to the tab label |
| F-11 | An empty state is shown when the user has no favorites |

### Non-Functional

| # | Requirement |
|---|---|
| NF-01 | The heart button must not interfere with clicking through to the restaurant page |
| NF-02 | Favorites state should survive page refresh without an API call |
| NF-03 | The feature should reuse existing shared components and pipes where possible |
| NF-04 | The new service should follow the same signal-based pattern as `CartService` and `AuthService` |

---

## Design

### New files

```
src/app/core/services/
  favorites.service.ts          # signal-based favorites state, persisted to localStorage

src/app/shared/components/
  favorite-button/
    favorite-button.ts          # reusable heart toggle button
    favorite-button.html

src/app/features/account/
  favorites/
    favorites.ts                # account tab — list, search, sort, clear
    favorites.html
    favorites.scss
```

### Modified files

```
src/app/shared/components/restaurant-card/
  restaurant-card.ts            # import FavoriteButton
  restaurant-card.html          # add <app-favorite-button> to card image overlay

src/app/features/account/account-shell/
  account-shell.html            # add Favorites nav link

src/app/app.routes.ts           # register /account/favorites child route
```

### Service design

`FavoritesService` will follow the same pattern as `CartService`:

- Internal `signal<Restaurant[]>` for the list
- `computed()` for derived values (count)
- `localStorage` persistence on every change
- Public methods: `addFavorite`, `removeFavorite`, `toggle`, `isFavorite`, `clearAll`

### State flow

```
User clicks heart
  → FavoriteButton.toggle()
    → FavoritesService.toggle()
      → updates signal
      → persists to localStorage
  → (favorited) output emitted
    → RestaurantCard.onFavorited()
      → re-calls FavoritesService.toggle()
```

### Data stored in localStorage

Key: `app_favorites`

Storing the full restaurant objects makes it easy to render the Favorites page without an extra API call — same approach the cart uses for cart items.

---

## Alternatives considered

**Option A — Store only restaurant IDs**
Simpler storage, always fresh data. Downside: requires an API call every time the Favorites page loads to resolve the full objects. Rejected in favor of Option B for simplicity.

**Option B — Store full objects (chosen)**
Matches how `CartService` stores `CartItem` objects. Faster page load on the Favorites tab. Accepted as the simpler path for this mock-API app.

**Option C — NgRx / global store**
Overkill for this scope. The existing app uses signal-based services everywhere.

---

## Testing notes

- Manually verified: heart button toggles correctly on the restaurant list
- Manually verified: navigating to Account > Favorites shows saved restaurants
- Manually verified: page refresh preserves favorites
- Manually verified: "Clear All" empties the list

No unit tests added in this PR — will follow up in a separate ticket.

---

## Open questions

- Should favorites sync across devices eventually? (out of scope for now)
- Should there be a max cap on how many restaurants you can favorite? (not in requirements, skipped)
- Should the navbar show a favorites shortcut icon? (deferred to design review)

---

## Checklist

- [x] New service follows `Injectable({ providedIn: 'root' })` pattern
- [x] Route added with lazy `loadComponent`
- [x] Nav link added to account shell sidebar
- [x] Heart button does not bubble click to the restaurant card link
- [ ] Unit tests (follow-up ticket)
- [ ] E2E test (follow-up ticket)
