import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { UserService } from './services/user.service';
import { AuthService } from '@auth0/auth0-angular';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ToolbarModule, ButtonModule, CommonModule, MenuModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'PEI-web-app';
  userInitials: string = '';
  profileMenuItems: MenuItem[] = [];
  isAuthenticated$;
  user$;

  @ViewChild('profileMenu') profileMenu!: Menu;

  constructor(
    private router: Router,
    private userService: UserService,
    public authService: AuthService
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    // Subscribe to Auth0 user and update UserService
    this.user$.subscribe(auth0User => {
      if (auth0User) {
        this.userService.setUser({
          firstName: auth0User.given_name || auth0User.name?.split(' ')[0] || '',
          lastName: auth0User.family_name || auth0User.name?.split(' ')[1] || '',
          email: auth0User.email || ''
        });
      }
    });

    this.userService.currentUser.subscribe(user => {
      this.userInitials = this.userService.getInitials();
    });

    this.profileMenuItems = [
      {
        label: 'My Account',
        icon: 'pi pi-user',
        command: () => this.navigateToAccount()
      },
      {
        separator: true
      },
      {
        label: 'Log Out',
        icon: 'pi pi-sign-out',
        command: () => this.logout()
      }
    ];
  }

  toggleProfileMenu(event: Event) {
    this.profileMenu.toggle(event);
  }

  login() {
    this.authService.loginWithRedirect();
  }

  navigateToAccount() {
    console.log('Navigate to account');
    // TODO: Implement account navigation
  }

  logout() {
    this.userService.clearUser();
    this.authService.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  navigateToHome() {
    this.router.navigate(['/']);
  }
}
