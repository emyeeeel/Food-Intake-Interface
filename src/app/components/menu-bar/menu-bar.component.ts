import { Component } from '@angular/core';
import { MenuOptionComponent } from '../menu-option/menu-option.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-bar',
  imports: [MenuOptionComponent],
  templateUrl: './menu-bar.component.html',
  styleUrl: './menu-bar.component.scss'
})
export class MenuBarComponent {
  constructor(private router: Router) {}

  logout() {
    // Optional: Clear any stored user data, tokens, etc.
    // localStorage.removeItem('userToken');
    // sessionStorage.clear();
    
    // Redirect to login page
    this.router.navigate(['/login']);
  }
}
