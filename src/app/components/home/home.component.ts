import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Site, SiteDataReading, SiteService } from '../../services/site.service';
import { SiteCardComponent } from '../site-card/site-card.component';
import { CommonModule } from '@angular/common';
import { TenantService, Tenant, TenantSite } from '../../services/tenant.service';
import { WebSocketService } from '../../services/websocket.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-home',
    imports: [CommonModule, SiteCardComponent, ProgressSpinnerModule, ButtonModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {

  loading: boolean = true;
  tenant: undefined | Tenant;
  sites: Site[] = [];
  layout: 'grid' | 'list' = 'grid';
  readings: { [site_id: number]: SiteDataReading } = {};
  private wsSubscription?: Subscription;
  private siteDataSubscription?: Subscription;

  constructor(
    private tenantService: TenantService,
    private webSocketService: WebSocketService,
    private siteService: SiteService
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

        this.siteService.getLatestReadings(t.tenant_id).subscribe({
          next: (response) => {
            const map: { [site_id: number]: SiteDataReading } = {};
            for (const r of response.sites) {
              map[r.site_id] = r;
            }
            this.readings = map;
          }
        });

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

    this.siteDataSubscription = this.webSocketService.siteData$.subscribe(reading => {
      this.readings = { ...this.readings, [reading.site_id]: reading };
    });
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
    this.siteDataSubscription?.unsubscribe();
  }

  private mapConnectionStatus(status?: boolean): 'online' | 'warning' | 'offline' {
    if (status === true) {
      return 'online';
    }
    return 'offline';
  }

}
