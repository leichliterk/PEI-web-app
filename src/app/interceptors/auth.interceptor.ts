import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { catchError, switchMap } from 'rxjs';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.API_SERVER)) return next(req);

  const auth = inject(AuthService);
  return auth.getAccessTokenSilently().pipe(
    switchMap(token => {
      const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
      return next(authReq);
    }),
    catchError(() => next(req))  // if token retrieval fails, send request without auth header
  );
};