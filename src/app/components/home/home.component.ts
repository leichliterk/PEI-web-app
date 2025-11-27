import { Component, OnInit } from '@angular/core';
import { SiteService, Site } from '../../services/site.service';
import { SiteComponent } from '../site/site.component';
import { CommonModule } from '@angular/common';
import { TenantService, Tenant } from '../../services/tenant.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
    selector: 'app-home',
    imports: [CommonModule, SiteComponent, ProgressSpinnerModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  loading: boolean = true;
  tenant: undefined | Tenant;
  sites: undefined | Array<Site>;

  constructor(private tenantService: TenantService) { }

  ngOnInit(): void {
    this.tenantService.getTenantById(1001).subscribe({
      next: (t) => {
        console.log('Sites data:', t);
        this.tenant = t;
        t.sites.forEach((s: any) => {
          let site: Site = {
            site_id: s.site_id,
            name: s.name,
            connection_status: 'offline',
          }
          this.sites?.push(site);
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tenant:', error);
      }
    });
  }

}
