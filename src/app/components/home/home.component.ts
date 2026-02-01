import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Site } from '../../services/site.service';
import { SiteCardComponent } from '../site-card/site-card.component';
import { CommonModule } from '@angular/common';
import { TenantService, Tenant, TenantSite } from '../../services/tenant.service';
import { WebSocketService } from '../../services/websocket.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
    selector: 'app-home',
    imports: [CommonModule, SiteCardComponent, ProgressSpinnerModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {

  loading: boolean = true;
  tenant: undefined | Tenant;
  sites: Site[] = [];
  private wsSubscription?: Subscription;

  constructor(
    private tenantService: TenantService,
    private webSocketService: WebSocketService
  ) { }

  ngOnInit(): void {
    this.tenantService.getTenantById(1001).subscribe({
      next: (t) => {
        this.tenant = t;
        this.sites = t.sites.map((s: TenantSite) => ({
          site_id: s.site_id,
          name: s.name,
          connection_status: this.mapConnectionStatus(s.connection_status),
        }));
        this.loading = false;

        // Connect to WebSocket for real-time updates
        this.webSocketService.connect(t.tenant_id);
        this.wsSubscription = this.webSocketService.siteStatus$.subscribe(update => {
          this.sites = this.sites.map(site =>
            site.site_id === update.site_id
              ? { ...site, connection_status: this.mapConnectionStatus(update.connection_status) }
              : site
          );
        });
      },
      error: (error) => {
        console.error('Error loading tenant:', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
    this.webSocketService.disconnect();
  }

  private mapConnectionStatus(status?: boolean): 'online' | 'warning' | 'offline' {
    if (status === true) {
      return 'online';
    }
    return 'offline';
  }

}
