import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { sanitizationInterceptor } from './interceptors/sanitization-functional.interceptor';
import { browserCompatibilityInterceptor } from './interceptors/browser-compatibility.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top', // Scroll al top al navegar entre rutas
        anchorScrolling: 'enabled'        // Soporte para fragmentos #id
      })
    ),
    provideHttpClient(withInterceptors([
      browserCompatibilityInterceptor,
      authInterceptor,
      sanitizationInterceptor
    ])),
    importProvidersFrom(ReactiveFormsModule),
    provideAnimations()
  ]
};
