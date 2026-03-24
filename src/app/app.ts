import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './shared/components/navbar/navbar';
import { CartDrawer } from './features/cart/cart-drawer/cart-drawer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, CartDrawer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
