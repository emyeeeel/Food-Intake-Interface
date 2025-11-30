import { Component, EventEmitter, Output } from '@angular/core';
import { MenuOptionComponent } from '../menu-option/menu-option.component';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu-bar',
  imports: [MenuOptionComponent, CommonModule],
  templateUrl: './menu-bar.component.html',
  styleUrl: './menu-bar.component.scss'
})
export class MenuBarComponent {
  @Output() mobileMenuToggle = new EventEmitter<boolean>();

  isMobileOpen = false;

  constructor(private router: Router) {}

  toggleMobileMenu() {
    this.isMobileOpen = !this.isMobileOpen;
    this.mobileMenuToggle.emit(this.isMobileOpen); // emit boolean
  }

  logout() {
    this.router.navigate(['/login']);
  }
}
