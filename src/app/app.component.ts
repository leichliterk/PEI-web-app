import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { PopoverModule } from 'primeng/popover';
import { Popover } from 'primeng/popover';
import { UserService } from './services/user.service';
import { WebSocketService } from './services/websocket.service';
import { TenantService } from './services/tenant.service';
import { AppNotification, NotificationService } from './services/notification.service';
import { AuthService } from '@auth0/auth0-angular';
import { environment } from '../environments/environment';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ToolbarModule, ButtonModule, CommonModule, MenuModule, DialogModule, PopoverModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'PEI-web-app';
  userInitials: string = '';
  profileMenuItems: MenuItem[] = [];
  isAuthenticated$;
  user$;
  environment = environment;
  aboutVisible: boolean = false;
  appVersion: string = environment.app_version;
  auth0Id: string = '';
  unreadCount: number = 0;
  notifications: AppNotification[] = [];
  private unreadSub?: Subscription;
  private notificationsSub?: Subscription;

  @ViewChild('profileMenu') profileMenu!: Menu;
  @ViewChild('notificationPanel') notificationPanel!: Popover;

  constructor(
    private router: Router,
    private userService: UserService,
    private webSocketService: WebSocketService,
    private tenantService: TenantService,
    public notificationService: NotificationService,
    public authService: AuthService
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    this.user$.subscribe(auth0User => {
      if (auth0User) {
        this.userService.setUser({
          firstName: auth0User.given_name || auth0User.name?.split(' ')[0] || '',
          lastName: auth0User.family_name || auth0User.name?.split(' ')[1] || '',
          email: auth0User.email || ''
        });

        this.auth0Id = auth0User.sub ?? '';

        // Connect to WebSocket when authenticated
        this.tenantService.getTenantById(1001).subscribe({
          next: (tenant) => {
            this.webSocketService.connect(tenant.tenant_id);
            this.webSocketService.identify(this.auth0Id);
          }
        });

        // Load notification inbox
        if (this.auth0Id) {
          this.notificationService.loadUserNotifications(this.auth0Id);
        }
      }
    });

    this.userService.currentUser.subscribe(() => {
      this.userInitials = this.userService.getInitials();
    });

    this.unreadSub = this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });

    this.notificationsSub = this.notificationService.notifications$.subscribe(ns => {
      this.notifications = ns;
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
        label: 'About',
        icon: 'pi pi-info-circle',
        command: () => this.showAbout()
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

  ngOnDestroy(): void {
    this.unreadSub?.unsubscribe();
    this.notificationsSub?.unsubscribe();
  }

  toggleProfileMenu(event: Event) {
    this.profileMenu.toggle(event);
  }

  toggleNotifications(event: Event) {
    this.notificationPanel.toggle(event);
  }

  markNotificationRead(id: string) {
    this.notificationService.markRead(id);
  }

  deleteNotification(id: string, event: Event) {
    event.stopPropagation();
    this.notificationService.deleteNotification(id);
  }

  markAllRead() {
    if (this.auth0Id) {
      this.notificationService.markAllRead(this.auth0Id);
    }
  }

  showAbout() {
    this.aboutVisible = true;
  }

  login() {
    this.authService.loginWithRedirect();
  }

  navigateToAccount() {
    console.log('Navigate to account');
    // TODO: Implement account navigation
  }

  logout() {
    this.webSocketService.disconnect();
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
