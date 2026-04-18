import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  imports: [CommonModule],
  template: `
    <div class="forbidden-container">
      <div class="forbidden-card">
        <div class="code">403</div>
        <div class="title">Forbidden</div>
        <div class="message">This page is currently disabled.</div>
        <button class="btn" (click)="goHome()">Back to Home</button>
      </div>
    </div>
  `,
  styles: [`
    .forbidden-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #F0F9F7;
      font-family: 'Quicksand', sans-serif;
    }

    .forbidden-card {
      text-align: center;
      padding: 40px;
    }

    .code {
      font-size: 6rem;
      font-weight: 700;
      color: #e74c3c;
      line-height: 1;
      margin-bottom: 8px;
    }

    .title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #00313C;
      margin-bottom: 16px;
    }

    .message {
      font-size: 1rem;
      color: #666;
      margin-bottom: 32px;
    }

    .btn {
      padding: 12px 32px;
      background: #40C1AC;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      font-family: 'Quicksand', sans-serif;
      font-weight: 600;
    }

    .btn:hover {
      background: #2FA695;
    }
  `],
})
export class ForbiddenComponent {
  constructor(private router: Router) {}
  goHome() { this.router.navigate(['/home']); }
}
