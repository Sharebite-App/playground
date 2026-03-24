# Angular Food Ordering App — Implementation Plan

A simplified clone of the webapp, built with Angular. All backend calls are replaced with mock data services. No real API, no auth server — everything runs locally out of the box.

---

## 1. Goals & Scope

### In scope
- Search and browse restaurants (with filters)
- View a restaurant's menu and add items to cart
- Cart sidebar / drawer
- Checkout flow (address, payment, order summary)
- Order confirmation page
- Account settings (profile, saved addresses, payment methods, order history)
- Auth screens (login / register) — mocked, no real JWT

### Out of scope
- Real API integration
- Group orders
- Passport / subscription features
- Catering calendar
- Real payment processing

---

## 2. Technology Choices

| Concern | Choice | Reason |
|---|---|---|
| Framework | Angular 21 (standalone components) | Matches source app; standalone removes NgModule boilerplate |
| State | Angular Signals + injectable services | Lighter than MobX/NgRx for a simplified app |
| Routing | Angular Router (lazy routes) | Same pattern as source |
| Styling | Bootstrap 5 + custom SCSS | Same as source |
| HTTP | No real HTTP — `MockApiService` returns `Observable` from static data | Keeps app fully self-contained |
| Forms | Angular Reactive Forms | Same as source |
| Tests | Jasmine + Karma (unit), Cypress (e2e) | Same toolchain as source |

---

## 3. Project Structure

```
src/
  app/
    core/
      guards/          # auth.guard.ts
      interceptors/    # (none needed — no real HTTP)
      models/          # shared interfaces: Restaurant, MenuItem, Order, User, Cart
      services/
        auth.service.ts          # signal-based auth state
        cart.service.ts          # signal-based cart state
        mock-api.service.ts      # all fake data + fake HTTP delays
    features/
      auth/
        login/
        register/
      restaurants/
        restaurants-list/        # search + filter page
        restaurant-detail/       # menu page
        menu-item-modal/         # item customization modal
      cart/
        cart-drawer/             # slide-out cart
      checkout/
        checkout-page/
        order-confirmation/
      account/
        account-shell/           # tabbed container
        profile/
        addresses/
        payment-methods/
        order-history/
    shared/
      components/
        navbar/
        search-bar/
        restaurant-card/
        star-rating/
        spinner/
        empty-state/
      pipes/
        currency-format.pipe.ts
      directives/
        click-outside.directive.ts
    app.routes.ts
    app.config.ts
    app.component.ts
  assets/
    mock-data/
      restaurants.json
      menus.json
      orders.json
  styles.scss
```

---

## 4. Data Models

### Restaurant
```ts
interface Restaurant {
  id: number;
  name: string;
  cuisine: string[];
  rating: number;           // 0–5
  deliveryFee: number;
  estimatedDeliveryTime: string; // e.g. "25–35 min"
  photo: string;
  street: string;
  isOpen: boolean;
  tags: string[];           // e.g. ["Popular", "New"]
}
```

### MenuItem / MenuCategory
```ts
interface MenuCategory {
  id: number;
  name: string;
  items: MenuItem[];
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  photo: string;
  choices: MenuItemChoice[];  // e.g. size, toppings
}

interface MenuItemChoice {
  id: number;
  title: string;             // e.g. "Size"
  required: boolean;
  options: { id: number; name: string; priceAdd: number }[];
}
```

### Cart
```ts
interface CartItem {
  menuItemId: number;
  restaurantId: number;
  name: string;
  price: number;
  quantity: number;
  selectedOptions: { choiceId: number; optionId: number; name: string; priceAdd: number }[];
  specialInstructions?: string;
}
```

### Order
```ts
interface Order {
  id: string;
  restaurantName: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  tip: number;
  total: number;
  status: 'placed' | 'preparing' | 'on_the_way' | 'delivered';
  placedAt: string;          // ISO date string
  deliveryAddress: string;
}
```

### User
```ts
interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addresses: SavedAddress[];
  paymentMethods: PaymentMethod[];
}

interface SavedAddress {
  id: number;
  label: string;            // e.g. "Home", "Work"
  street: string;
  floor?: string;
}

interface PaymentMethod {
  id: number;
  last4: string;
  brand: string;            // e.g. "Visa"
  isDefault: boolean;
}
```

---

## 5. Mock Data Strategy

`MockApiService` is the single source of truth for fake data. It:

- Holds in-memory arrays seeded from `assets/mock-data/*.json`
- Returns `of(data).pipe(delay(300))` to simulate network latency
- Exposes methods matching what a real service would need:

```ts
// restaurants
getRestaurants(query?: string, cuisine?: string): Observable<Restaurant[]>
getRestaurant(id: number): Observable<Restaurant>
getMenu(restaurantId: number): Observable<MenuCategory[]>

// orders
placeOrder(payload: PlaceOrderPayload): Observable<Order>
getOrderHistory(): Observable<Order[]>

// account
getProfile(): Observable<User>
updateProfile(patch: Partial<User>): Observable<User>
addAddress(address: SavedAddress): Observable<SavedAddress>
deleteAddress(id: number): Observable<void>
addPaymentMethod(pm: PaymentMethod): Observable<PaymentMethod>
deletePaymentMethod(id: number): Observable<void>
```

---

## 6. Routing

```
/login                         — public
/register                      — public
/restaurants                   — guarded (IsLoggedIn)
/restaurants/:id/:name         — guarded
/checkout                      — guarded
/order-confirmation/:orderId   — guarded
/account                       — guarded, children:
  /account/profile
  /account/addresses
  /account/payment-methods
  /account/order-history
```

`AuthGuard` checks `AuthService.isLoggedIn()` (a signal). Since auth is mocked, login always succeeds and sets a flag in `localStorage` so page refreshes don't log the user out.

---

## 7. Feature Breakdown

### 7.1 Restaurants List (`/restaurants`)

- Search bar at top (debounced input, 300 ms)
- Cuisine filter chips (All, Pizza, Sushi, Burgers, …)
- Sort toggle (Rating, Delivery Time, Delivery Fee)
- Restaurant cards in a responsive grid — each shows photo, name, cuisine tags, rating stars, delivery fee, ETA
- "No results" empty state when search yields nothing

**Key component inputs/outputs:**
```
<app-search-bar (search)="onSearch($event)" />
<app-restaurant-card [restaurant]="r" (click)="navigate(r)" />
```

### 7.2 Restaurant Menu (`/restaurants/:id/:name`)

- Restaurant hero (photo, name, cuisine, rating, delivery info)
- Sticky category nav (scrollspy or simple tab row)
- Menu items grouped by category
- Clicking an item opens `MenuItemModalComponent` (ng-bootstrap modal)
  - Shows item photo, description, choices (radio for required, checkbox for optional)
  - Quantity stepper
  - "Add to Cart" button that dispatches to `CartService`

### 7.3 Cart Drawer

- Triggered by navbar cart icon (badge shows item count)
- Slide-in panel listing items, quantities, subtotal
- Each line: item name, selected options summary, price, +/- quantity, remove button
- "Go to Checkout" CTA
- Persisted to `localStorage` via `CartService` so it survives refresh

### 7.4 Checkout (`/checkout`)

- Step 1 — Delivery: pick from saved addresses or enter a new one
- Step 2 — Payment: pick from saved cards or enter a new one (card fields mocked — no real validation beyond basic format)
- Step 3 — Review: order summary table, tip selector (0 / 15 / 18 / 20 / custom %), place order button
- On submit: call `MockApiService.placeOrder()`, clear cart, navigate to `/order-confirmation/:id`

### 7.5 Order Confirmation (`/order-confirmation/:id`)

- Success banner with order ID
- Summary: restaurant, items, totals
- Estimated delivery time (random mock: 25–45 min from now)
- "Track Order" button (shows a mocked status stepper: Placed → Preparing → On the Way → Delivered)
- "Back to Restaurants" link

### 7.6 Account Settings (`/account`)

Tabbed layout with four tabs:

| Tab | What it does |
|---|---|
| Profile | Edit first name, last name, email, phone — reactive form with validation |
| Addresses | List saved addresses, add new, delete |
| Payment Methods | List saved cards (last 4 + brand), add new (mocked form), delete, set default |
| Order History | Paginated list of past orders, click to expand order detail |

---

## 8. State Management

Two signal-based services cover shared state:

### `CartService`
```ts
items = signal<CartItem[]>([]);
itemCount = computed(() => items().reduce((n, i) => n + i.quantity, 0));
subtotal = computed(() => items().reduce((s, i) => s + (i.price + optionsTotal(i)) * i.quantity, 0));

addItem(item: CartItem): void
removeItem(menuItemId: number): void
updateQuantity(menuItemId: number, qty: number): void
clear(): void
```

Persisted to/from `localStorage` on every change.

### `AuthService`
```ts
currentUser = signal<User | null>(null);
isLoggedIn = computed(() => currentUser() !== null);

login(email: string, password: string): Observable<User>  // always succeeds with mock user
logout(): void
```

---

## 9. Shared Components

| Component | Props | Notes |
|---|---|---|
| `NavbarComponent` | — | Shows logo, search shortcut, cart icon w/ badge, account menu |
| `SearchBarComponent` | `placeholder`, `(search)` output | Debounced 300 ms |
| `RestaurantCardComponent` | `restaurant: Restaurant` | Used in restaurants list |
| `StarRatingComponent` | `rating: number` | Renders 0–5 stars |
| `SpinnerComponent` | `size: 'sm'\|'md'\|'lg'` | Wraps ngx-skeleton-loader or a simple CSS spinner |
| `EmptyStateComponent` | `message`, `icon` | Generic "nothing here" display |

---

## 10. Styling Approach

- Bootstrap 5 for layout grid, utility classes, modals, forms
- One `styles.scss` with CSS custom properties for brand colors (matching source app palette)
- Each component has its own `.scss` file (ViewEncapsulation.Emulated)
- No global component library dependency beyond Bootstrap and ng-bootstrap

---

## 11. Build & Dev Setup

```bash
# scaffold
ng new webapp-clone --routing --style=scss --standalone

# add dependencies
npm install bootstrap @ng-bootstrap/ng-bootstrap

# run
ng serve

# test
ng test
npx cypress open
```

Angular version: **21** (standalone components, `provideRouter`, `provideHttpClient`).

---

## 12. Implementation Phases

### Phase 1 — Foundation
- [ ] Scaffold Angular project (`ng new`)
- [ ] Set up routing skeleton with all route paths (lazy)
- [ ] Create `AuthService`, `CartService`, `MockApiService`
- [ ] Seed `mock-data/*.json` with 10+ restaurants, 3–5 menus, 5+ past orders
- [ ] Add `NavbarComponent` and auth guard
- [ ] Login / register screens (mocked)

### Phase 2 — Restaurants & Menu
- [ ] `RestaurantsListComponent` with search, filters, sort
- [ ] `RestaurantCardComponent`
- [ ] `RestaurantDetailComponent` (menu page)
- [ ] `MenuItemModalComponent` with choices and quantity stepper
- [ ] Wire add-to-cart to `CartService`

### Phase 3 — Cart & Checkout
- [ ] `CartDrawerComponent` (slide-in, persisted)
- [ ] `CheckoutPageComponent` (3-step form)
- [ ] `OrderConfirmationComponent` with mocked tracker

### Phase 4 — Account
- [ ] `AccountShellComponent` (tabbed layout)
- [ ] Profile tab
- [ ] Addresses tab
- [ ] Payment Methods tab
- [ ] Order History tab

### Phase 5 — Polish
- [ ] Loading skeletons for restaurant list and menu
- [ ] Form validation messages
- [ ] Responsive layout (mobile breakpoints)
- [ ] Empty states
- [ ] Basic unit tests for services
- [ ] Basic Cypress e2e: search → menu → add to cart → checkout

---

## 13. Mock Data Seed (summary)

**Restaurants (10):** Shake Shack, Joe's Pizza, Ichiran Ramen, Sweetgreen, Chipotle, Dig Inn, Sushi Nakazawa, The Halal Guys, Num Pang, Essen NY Deli

**Cuisines for filters:** American, Pizza, Ramen, Salads, Mexican, Japanese, Sandwiches, Middle Eastern

**Menu categories per restaurant:** 3–5 categories, 4–8 items each, 1–2 items with modifier choices (size, toppings, protein swap)

**Past orders (per mock user):** 5 orders across different restaurants with statuses `delivered` and `placed`

**Mock user:**
```json
{
  "id": 1,
  "firstName": "Alex",
  "lastName": "Kim",
  "email": "alex.kim@example.com",
  "phone": "555-555-1234",
  "addresses": [
    { "id": 1, "label": "Home", "street": "123 Main St, New York, NY 10001" },
    { "id": 2, "label": "Work", "street": "456 Park Ave, New York, NY 10022" }
  ],
  "paymentMethods": [
    { "id": 1, "last4": "4242", "brand": "Visa", "isDefault": true }
  ]
}
```
