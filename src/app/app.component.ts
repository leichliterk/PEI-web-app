import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { UserService } from './services/user.service';

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

  @ViewChild('profileMenu') profileMenu!: Menu;

  constructor(private router: Router, private userService: UserService) {}

  ngOnInit(): void {
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

  navigateToAccount() {
    console.log('Navigate to account');
    // TODO: Implement account navigation
  }

  logout() {
    console.log('Logging out');
    // TODO: Implement logout functionality
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  navigateToHome() {
    this.router.navigate(['/']);
  }
}
