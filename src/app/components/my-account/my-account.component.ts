import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AppUser, UserService } from '../../services/user.service';
import { TenantService, TenantSite } from '../../services/tenant.service';

@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, ProgressSpinnerModule],
  templateUrl: './my-account.component.html',
  styleUrl: './my-account.component.scss',
})
export class MyAccountComponent implements OnInit {
  user: AppUser | null = null;
  siteMap: Record<string, string> = {};
  loadingSites = true;

  constructor(
    private userService: UserService,
    private tenantService: TenantService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.user = this.userService.appUserValue;
    const tid = this.user?.tenant_id;
    if (tid) {
      this.tenantService.getTenantById(tid).subscribe({
        next: tenant => {
          this.siteMap = Object.fromEntries(
            tenant.sites.map((s: TenantSite) => [s.site_id, s.name])
          );
          this.loadingSites = false;
        },
        error: () => { this.loadingSites = false; },
      });
    } else {
      this.loadingSites = false;
    }
  }

  get assignedSites(): { id: string; name: string }[] {
    return (this.user?.site_ids ?? []).map(id => ({
      id,
      name: this.siteMap[id] ?? id,
    }));
  }

  roleLabel(role: string): string {
    if (role === 'global_admin') return 'Global Administrator';
    if (role === 'administrator') return 'Administrator';
    return 'User';
  }

  statusSeverity(status: string): 'success' | 'warn' | 'secondary' {
    if (status === 'active') return 'success';
    if (status === 'pending') return 'warn';
    return 'secondary';
  }

  editProfile(): void {
    if (this.user) {
      this.router.navigate(['/user-edit'], { state: { user: this.user, returnUrl: '/my-account' } });
    }
  }
}
