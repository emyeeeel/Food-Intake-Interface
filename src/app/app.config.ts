import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { routes } from './app.routes';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { SettingsService } from './services/settings.service';

function initializeAppSettings(settingsService: SettingsService) {
  return () => settingsService.load();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAppSettings,
      deps: [SettingsService],
      multi: true,
    }
  ]
};
