import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EngineeringService } from '../services/engineering.service';

/**
 * Gates /engineering/* sub-routes behind the engineering-mode password session.
 *
 * Unlike moduleGuard (which checks ModuleConfig.is_active for public-facing
 * modules), this guard verifies that the user has successfully logged in via
 * the engineering password screen. Without it, anyone with the URL could
 * bypass the password by hitting /engineering/meal-admin directly.
 *
 * Redirects to /engineering (the login screen) when not authenticated.
 */
export const engineeringAuthGuard: CanActivateFn = () => {
  const engService = inject(EngineeringService);
  const router = inject(Router);

  if (engService.isAuthenticated$.value) {
    return true;
  }

  router.navigate(['/engineering']);
  return false;
};
