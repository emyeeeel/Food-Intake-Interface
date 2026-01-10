import { Routes } from '@angular/router';
import { LogInComponent } from './pages/log-in/log-in.component';
import { HomepageComponent } from './pages/homepage/homepage.component';
import { MealIntakeComponent } from './pages/meal-intake/meal-intake.component';
import { MealCatalogComponent } from './pages/meal-catalog/meal-catalog.component';
import { IngredientsComponent } from './pages/ingredients/ingredients.component';
import { PatientInfoComponent } from './pages/patient-info/patient-info.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { MealAssignmentComponent } from './components/meal-assignment/meal-assignment.component';
import { DailyConsumptionComponent } from './components/daily-consumption/daily-consumption.component';
import { QrTestComponent } from './components/qr-test/qr-test.component';
import { PatientDetailsComponent } from './components/patient-details/patient-details.component';
import { PrintAllMealsComponent } from './components/print-all-meals/print-all-meals.component';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LogInComponent },
    { path: 'home', component: HomepageComponent },

    { path: 'meal-intake', component: MealIntakeComponent },
    { path: 'meal-intake/add', component: MealIntakeComponent },
    { path: 'meal-intake/all', component: MealIntakeComponent },
    { path: 'meal-intake/print', component: MealIntakeComponent },
    
    { path: 'meal-catalog', component: MealCatalogComponent },
    { path: 'meal-catalog/add', component: MealCatalogComponent },
    { path: 'meal-catalog/all', component: MealCatalogComponent },
    { path: 'meal-catalog/print', component: MealCatalogComponent },

    { path: 'ingredients', component: IngredientsComponent },
    { path: 'ingredients/add', component: IngredientsComponent },
    { path: 'ingredients/all', component: IngredientsComponent },
    { path: 'ingredients/print', component: IngredientsComponent },

    { path: 'patient-info', component: PatientInfoComponent },
    { path: 'patient-info/add', component: PatientInfoComponent },
    { path: 'patient-info/all', component: PatientInfoComponent },
    { path: 'patient-info/print', component: PatientInfoComponent },
    { path: 'patient-info/:id', component: PatientInfoComponent },

    { path: 'settings', component: SettingsComponent },
    { path: 'test', component: PrintAllMealsComponent },
];
