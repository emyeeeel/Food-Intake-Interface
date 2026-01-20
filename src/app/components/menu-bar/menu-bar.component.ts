import { Component, EventEmitter, Output } from '@angular/core';
import { MenuOptionComponent } from '../menu-option/menu-option.component';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';


@Component({
  selector: 'app-menu-bar',
  imports: [MenuOptionComponent],
  templateUrl: './menu-bar.component.html',
  styleUrl: './menu-bar.component.scss'
})
export class MenuBarComponent {
  @Output() mobileMenuToggle = new EventEmitter<boolean>();

  isMobileOpen = false;

  constructor(
    private router: Router,
    private auth: Auth
  ) {}

  toggleMobileMenu() {
    this.isMobileOpen = !this.isMobileOpen;
    this.mobileMenuToggle.emit(this.isMobileOpen); // emit boolean
  }

  async logout(): Promise<void> {
    try {
      // First, sign out from Firebase
      await signOut(this.auth);
      console.log('Firebase logout successful');
      
      // Then remove localStorage items
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userId');
      localStorage.removeItem('redirectUrl'); // Clean up any stored redirect URLs
      
      console.log('Local storage cleared');
      
      // Navigate to login page
      this.router.navigate(['/login']);
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if Firebase logout fails, clear local storage and redirect
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userId');
      localStorage.removeItem('redirectUrl');
      
      this.router.navigate(['/login']);
    }
  }
}
