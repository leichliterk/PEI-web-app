import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { switchMap, map, filter, take } from 'rxjs/operators';
import { UserService } from '../services/user.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    take(1),
    switchMap(isAuthenticated => {
      if (!isAuthenticated) {
        authService.loginWithRedirect();
        return [false];
      }
      return userService.appUser$.pipe(
        filter(user => user !== null),
        take(1),
        map(user => {
          if (user?.role === 'global_admin' || user?.role === 'administrator') {
            return true;
          }
          router.navigate(['/home']);
          return false;
        })
      );
    })
  );
};