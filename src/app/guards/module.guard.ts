import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EngineeringService } from '../services/engineering.service';
import { firstValueFrom, filter, take } from 'rxjs';

const ROUTE_TO_MODULE: Record<string, string> = {
  'home': 'homepage',
  'meal-intake': 'meal-intake',
  'meal-catalog': 'meal-catalog',
  'ingredients': 'ingredients',
  'patient-info': 'residents',
  'settings': 'settings',
};

export const moduleGuard: CanActivateFn = async (route) => {
  const engService = inject(EngineeringService);
  const router = inject(Router);

  const path = route.routeConfig?.path?.split('/')[0] || '';
  const moduleKey = ROUTE_TO_MODULE[path];

  if (!moduleKey) return true;

  // Wait for modules to be loaded (non-empty array)
  if (engService.modules$.value.length === 0) {
    await engService.loadModules();
  }

  // Double check - wait for data
  if (engService.modules$.value.length === 0) {
    await firstValueFrom(
      engService.modules$.pipe(filter(m => m.length > 0), take(1))
    );
  }

  if (!engService.isModuleActive(moduleKey)) {
    router.navigate(['/forbidden']);
    return false;
  }

  return true;
};
