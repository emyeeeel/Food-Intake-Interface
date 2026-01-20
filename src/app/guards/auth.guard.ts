import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  
  return new Promise<boolean>((resolve) => {
    onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        console.log('User is authenticated via Firebase:', user.email);
        resolve(true);
      } else {
        console.log('User not authenticated, redirecting to login');
        
        // Store the attempted URL to redirect back after login
        if (state.url !== '/') {
          localStorage.setItem('redirectUrl', state.url);
        }
        
        router.navigate(['/login']);
        resolve(false);
      }
    });
  });
};