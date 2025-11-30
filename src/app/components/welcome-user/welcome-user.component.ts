import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-welcome-user',
  imports: [CommonModule],
  templateUrl: './welcome-user.component.html',
  styleUrl: './welcome-user.component.scss'
})
export class WelcomeUserComponent implements OnInit {
  @Input() username: string = 'Emyeeeel'; // Default fallback username
  
  ngOnInit(): void {
    this.loadUsername();
  }
  
  private loadUsername(): void {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      this.username = storedUsername;
    }
  }
}

// guide to use component

// <!-- In any parent component template -->
// <app-welcome-user [username]="currentUser"></app-welcome-user>

// <!-- Or with a hardcoded value -->
// <app-welcome-user [username]="'John Doe'"></app-welcome-user>

// <!-- Or without input (will use default or loaded username) -->
// <app-welcome-user></app-welcome-user>