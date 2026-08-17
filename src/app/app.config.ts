import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authHttpInterceptorFn, provideAuth0 } from '@auth0/auth0-angular';
import { unauthorizedInterceptor } from './interceptors/unauthorized.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { CustomAuraTheme } from './theme/custom-aura-theme';
import { environment } from '../environments/environment';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authHttpInterceptorFn, unauthorizedInterceptor])),
    provideAnimationsAsync(),
    provideAuth0({
      domain: environment.AUTH_DOMAIN,
      clientId: environment.AUTH_CLIENT_ID,
      authorizationParams: {
        redirect_uri: environment.AUTH_REDIRECT_URI,
        audience: environment.AUTH_AUDIENCE,
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
      httpInterceptor: {
        allowedList: [`${environment.API_SERVER}/*`],
      },
    }),
    providePrimeNG({
      theme: {
        preset: CustomAuraTheme,
        options: {
          darkModeSelector: '.dark-mode',
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities'
          }
        }
      }
    })
  ]
};
