import { Routes } from '@angular/router';
import { LogInComponent } from './pages/log-in/log-in.component';
import { HomepageComponent } from './pages/homepage/homepage.component';
import { MealIntakeComponent } from './pages/meal-intake/meal-intake.component';
import { MealCatalogComponent } from './pages/meal-catalog/meal-catalog.component';
import { IngredientsComponent } from './pages/ingredients/ingredients.component';
import { PatientInfoComponent } from './pages/patient-info/patient-info.component';
import { SettingsComponent } from './pages/settings/settings.component';

import { authGuard } from './guards/auth.guard';
import { rootGuard } from './guards/root.guard';
import { PatientsComponent } from './tx2/pages/patients/patients.component';
import { IntakesComponent } from './tx2/pages/intakes/intakes.component';
import { MealsComponent } from './tx2/pages/meals/meals.component';
import { HomeComponent } from './tx2/pages/home/home.component';
import { NotificationComponent } from './tx2/components/notif/notif.component';
import { PopUpComponent } from './components/pop-up/pop-up.component';
import { EngineeringComponent } from './pages/engineering/engineering.component';
import { ForbiddenComponent } from './pages/forbidden/forbidden.component';
import { moduleGuard } from './guards/module.guard';

export const routes: Routes = [
    { path: '', canActivate: [rootGuard], children: [] },
    { path: 'login', component: LogInComponent },
    { path: 'forbidden', component: ForbiddenComponent },
    { path: 'home', canActivate: [authGuard, moduleGuard], component: HomepageComponent },

    { path: 'meal-intake', canActivate: [authGuard, moduleGuard], component: MealIntakeComponent },
    { path: 'meal-intake/add', canActivate: [authGuard, moduleGuard], component: MealIntakeComponent },
    { path: 'meal-intake/all', canActivate: [authGuard, moduleGuard], component: MealIntakeComponent },
    { path: 'meal-intake/print', canActivate: [authGuard, moduleGuard], component: MealIntakeComponent },

    { path: 'meal-catalog', canActivate: [authGuard, moduleGuard], component: MealCatalogComponent },
    { path: 'meal-catalog/add', canActivate: [authGuard, moduleGuard], component: MealCatalogComponent },
    { path: 'meal-catalog/all', canActivate: [authGuard, moduleGuard], component: MealCatalogComponent },
    { path: 'meal-catalog/print', canActivate: [authGuard, moduleGuard], component: MealCatalogComponent },
    { path: 'meal-catalog/:id/edit', canActivate: [authGuard, moduleGuard], component: MealCatalogComponent },
    { path: 'meal-catalog/:id/view', canActivate: [authGuard, moduleGuard], component: MealCatalogComponent },

    { path: 'ingredients', canActivate: [authGuard, moduleGuard], component: IngredientsComponent },
    { path: 'ingredients/add', canActivate: [authGuard, moduleGuard], component: IngredientsComponent },
    { path: 'ingredients/all', canActivate: [authGuard, moduleGuard], component: IngredientsComponent },
    { path: 'ingredients/print', canActivate: [authGuard, moduleGuard], component: IngredientsComponent },

    { path: 'patient-info', canActivate: [authGuard, moduleGuard], component: PatientInfoComponent },
    { path: 'patient-info/add', canActivate: [authGuard, moduleGuard], component: PatientInfoComponent },
    { path: 'patient-info/all', canActivate: [authGuard, moduleGuard], component: PatientInfoComponent },
    { path: 'patient-info/print', canActivate: [authGuard, moduleGuard], component: PatientInfoComponent },
    { path: 'patient-info/:id/edit', canActivate: [authGuard, moduleGuard], component: PatientInfoComponent },
    { path: 'patient-info/:id/view', canActivate: [authGuard, moduleGuard], component: PatientInfoComponent },
    { path: 'patient-info/:id/meals', canActivate: [authGuard, moduleGuard], component: PatientInfoComponent },
    { path: 'patient-info/:id/intakes', canActivate: [authGuard, moduleGuard], component: PatientInfoComponent },
    { path: 'patient-info/:id/analysis', canActivate: [authGuard, moduleGuard], component: PatientInfoComponent },

    { path: 'patient-info/:id/intakes/:intakeId/view', canActivate: [authGuard, moduleGuard], component: PatientInfoComponent },

    { path: 'settings', canActivate: [authGuard, moduleGuard], component: SettingsComponent },

    //Machine interface routes
    { path: 'patients', canActivate: [authGuard], component: PatientsComponent },
    { path: 'intakes', canActivate: [authGuard], component: IntakesComponent },
    { path: 'meals', canActivate: [authGuard], component: MealsComponent },
    { path: 'patients/intakes/:id', canActivate: [authGuard], component: PatientsComponent },
    { path: 'home-page', canActivate: [authGuard], component: HomeComponent },

    { path: 'test', canActivate: [authGuard], component: PopUpComponent },

    // Hidden engineering route - no menu entry, access by URL only
    { path: 'engineering', component: EngineeringComponent },
];
