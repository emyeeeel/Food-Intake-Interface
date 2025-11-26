import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-log-in',
  imports: [],
  templateUrl: './log-in.component.html',
  styleUrl: './log-in.component.scss'
})
export class LogInComponent {
  constructor(private router: Router) {}

  login() {
    // Start session storage perhaps
    
    // Redirect to home page
    this.router.navigate(['/home']);
  }
}
