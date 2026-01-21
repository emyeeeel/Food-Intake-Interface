import { Routes } from '@angular/router';
import { LogInComponent } from './pages/log-in/log-in.component';
import { HomepageComponent } from './pages/homepage/homepage.component';
import { MealIntakeComponent } from './pages/meal-intake/meal-intake.component';
import { MealCatalogComponent } from './pages/meal-catalog/meal-catalog.component';
import { IngredientsComponent } from './pages/ingredients/ingredients.component';
import { PatientInfoComponent } from './pages/patient-info/patient-info.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { PrintAllMealsComponent } from './components/print-all-meals/print-all-meals.component';

import { authGuard } from './guards/auth.guard';
import { rootGuard } from './guards/root.guard';

export const routes: Routes = [
    { path: '', canActivate: [rootGuard], children: [] },
    { path: 'login', component: LogInComponent },
    { path: 'home', canActivate: [authGuard], component: HomepageComponent },

    { path: 'meal-intake', canActivate: [authGuard], component: MealIntakeComponent },
    { path: 'meal-intake/add', canActivate: [authGuard], component: MealIntakeComponent },
    { path: 'meal-intake/all', canActivate: [authGuard], component: MealIntakeComponent },
    { path: 'meal-intake/print', canActivate: [authGuard], component: MealIntakeComponent },
    
    { path: 'meal-catalog', canActivate: [authGuard], component: MealCatalogComponent },
    { path: 'meal-catalog/add', canActivate: [authGuard], component: MealCatalogComponent },
    { path: 'meal-catalog/all', canActivate: [authGuard], component: MealCatalogComponent },
    { path: 'meal-catalog/print', canActivate: [authGuard], component: MealCatalogComponent },
    { path: 'meal-catalog/edit', canActivate: [authGuard], component: MealCatalogComponent },
    { path: 'meal-catalog/view', canActivate: [authGuard], component: MealCatalogComponent },

    { path: 'ingredients', canActivate: [authGuard], component: IngredientsComponent },
    { path: 'ingredients/add', canActivate: [authGuard], component: IngredientsComponent },
    { path: 'ingredients/all', canActivate: [authGuard], component: IngredientsComponent },
    { path: 'ingredients/print', canActivate: [authGuard], component: IngredientsComponent },

    { path: 'patient-info', canActivate: [authGuard], component: PatientInfoComponent },
    { path: 'patient-info/add', canActivate: [authGuard], component: PatientInfoComponent },
    { path: 'patient-info/all', canActivate: [authGuard], component: PatientInfoComponent },
    { path: 'patient-info/print', canActivate: [authGuard], component: PatientInfoComponent },
    { path: 'patient-info/:id', canActivate: [authGuard], component: PatientInfoComponent },

    { path: 'settings', canActivate: [authGuard], component: SettingsComponent },
    { path: 'test', component: PrintAllMealsComponent },
];
