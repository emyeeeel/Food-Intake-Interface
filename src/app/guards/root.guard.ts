import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { CanActivateFn } from '@angular/router';

export const rootGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  
  return new Promise<boolean>((resolve) => {
    onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        console.log('User is authenticated, redirecting to home from root');
        router.navigate(['/home']);
        resolve(false); // Prevent navigation to empty route
      } else {
        console.log('User not authenticated, redirecting to login from root');
        router.navigate(['/login']);
        resolve(false); // Prevent navigation to empty route
      }
    });
  });
};