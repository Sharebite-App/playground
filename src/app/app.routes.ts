import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/restaurants', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register)
  },
  {
    path: 'restaurants',
    canActivate: [authGuard],
    loadComponent: () => import('./features/restaurants/restaurants-list/restaurants-list').then(m => m.RestaurantsList)
  },
  {
    path: 'restaurants/:id/:name',
    canActivate: [authGuard],
    loadComponent: () => import('./features/restaurants/restaurant-detail/restaurant-detail').then(m => m.RestaurantDetail)
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () => import('./features/checkout/checkout-page/checkout-page').then(m => m.CheckoutPage)
  },
  {
    path: 'order-confirmation/:orderId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/checkout/order-confirmation/order-confirmation').then(m => m.OrderConfirmation)
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () => import('./features/account/account-shell/account-shell').then(m => m.AccountShell),
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      { path: 'profile', loadComponent: () => import('./features/account/profile/profile').then(m => m.Profile) },
      { path: 'addresses', loadComponent: () => import('./features/account/addresses/addresses').then(m => m.Addresses) },
      { path: 'payment-methods', loadComponent: () => import('./features/account/payment-methods/payment-methods').then(m => m.PaymentMethods) },
      { path: 'order-history', loadComponent: () => import('./features/account/order-history/order-history').then(m => m.OrderHistory) },
      { path: 'allowance', loadComponent: () => import('./features/account/allowance/allowance').then(m => m.Allowance) }
    ]
  },
  { path: '**', redirectTo: '/restaurants' }
];
