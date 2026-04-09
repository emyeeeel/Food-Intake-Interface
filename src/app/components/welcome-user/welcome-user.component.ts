import { Component, OnInit } from '@angular/core';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';

@Component({
  selector: 'app-welcome-user',
  imports: [],
  templateUrl: './welcome-user.component.html',
  styleUrl: './welcome-user.component.scss'
})
export class WelcomeUserComponent implements OnInit {
  username: string = '';
  
  constructor(private auth: Auth) {}
  
  ngOnInit(): void {
    this.loadUsername();
  }
  
  private loadUsername(): void {
    // Check Firebase Auth first
    onAuthStateChanged(this.auth, (user: User | null) => {
      if (user && user.email) {
        // Extract username part before @ and capitalize
        const emailPrefix = user.email.split('@')[0];
        this.username = emailPrefix.toUpperCase();
        console.log('Firebase user email:', user.email);
        console.log('Username set to:', this.username);
      } else {
        // Fallback: try localStorage
        this.loadFromLocalStorage();
      }
    });
  }
  
  private loadFromLocalStorage(): void {
    // Try to get email from localStorage
    const storedEmail = localStorage.getItem('email') || 
                       localStorage.getItem('userEmail') || 
                       localStorage.getItem('loggedEmail') ||
                       localStorage.getItem('firebaseEmail');
    
    console.log('Checking localStorage for email:', storedEmail);
    
    if (storedEmail) {
      // Extract username part before @ and capitalize
      const emailPrefix = storedEmail.split('@')[0];
      this.username = emailPrefix.toUpperCase();
      console.log('Email from localStorage:', storedEmail);
    } else {
      // Fallback: try to get stored username directly
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        this.username = storedUsername;
      } else {
        this.username = 'USER'; // Default fallback
      }
      console.log('No email found, username set to:', this.username);
    }
  }
}