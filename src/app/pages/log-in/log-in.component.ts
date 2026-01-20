import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-log-in',
  imports: [FormsModule, CommonModule],
  templateUrl: './log-in.component.html',
  styleUrl: './log-in.component.scss'
})
export class LogInComponent {
  email = '';
  password = '';
  errorMessage = '';

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  async login() {
    try {
      await signInWithEmailAndPassword(
        this.auth,
        this.email,
        this.password
      );

      // Optional: session persistence
      // await setPersistence(this.auth, browserSessionPersistence);

      this.router.navigate(['/home']);
    } catch (error: any) {
      this.errorMessage = 'Login failed: Invalid credentials. Please try again.';
      console.error(error.errorMessage);
    }
  }
}
