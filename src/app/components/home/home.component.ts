import { Component, OnInit } from '@angular/core';
import { Site } from '../../services/site.service';
import { SiteCardComponent } from '../site-card/site-card.component';
import { CommonModule } from '@angular/common';
import { TenantService, Tenant, TenantSite } from '../../services/tenant.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
    selector: 'app-home',
    imports: [CommonModule, SiteCardComponent, ProgressSpinnerModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  loading: boolean = true;
  tenant: undefined | Tenant;
  sites: Site[] = [];

  constructor(private tenantService: TenantService) { }

  ngOnInit(): void {
    this.tenantService.getTenantById(1001).subscribe({
      next: (t) => {
        console.log('Sites data:', t);
        this.tenant = t;
        this.sites = t.sites.map((s: TenantSite) => ({
          site_id: s.site_id,
          name: s.name,
          connection_status: this.mapConnectionStatus(s.connection_status),
        }));
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tenant:', error);
      }
    });
  }

  private mapConnectionStatus(status?: boolean): 'online' | 'warning' | 'offline' {
    if (status === true) {
      return 'online';
    }
    return 'offline';
  }

}
