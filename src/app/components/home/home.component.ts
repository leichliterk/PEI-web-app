import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs';
import { Site, SiteDataReading, SiteService } from '../../services/site.service';
import { PlcSnapshot } from '../../services/websocket.service';
import { SiteCardComponent } from '../site-card/site-card.component';
import { CommonModule } from '@angular/common';
import { TenantService, Tenant, TenantSite } from '../../services/tenant.service';
import { UserService } from '../../services/user.service';
import { WebSocketService } from '../../services/websocket.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { Menu } from 'primeng/menu';
import { MenuItem, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
    selector: 'app-home',
    imports: [CommonModule, SiteCardComponent, ProgressSpinnerModule, ButtonModule, MenuModule, ToastModule],
    providers: [MessageService],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {

  @ViewChild('sortMenu') sortMenu!: Menu;

  openSortMenu(event: MouseEvent): void {
    const target = (event.target as HTMLElement).closest('button') ?? event.currentTarget;
    this.sortMenu.toggle({ currentTarget: target } as Event);
  }

  loading: boolean = true;
  loadError: boolean = false;
  private lastTenantId?: number;
  private lastAllowedSiteIds?: Set<string>;
  tenant: undefined | Tenant;
  sites: Site[] = [];
  private subscribedSites: { tenantId: number; siteId: string }[] = [];
  layout: 'grid' | 'list' = 'grid';
  sortBy: 'name' | 'site_id' = 'name';
  sortMenuItems: MenuItem[] = [
    { label: 'Site Name', icon: 'pi pi-check', command: () => this.setSort('name') },
    { label: 'Site ID', icon: 'pi pi-fw', command: () => this.setSort('site_id') }
  ];

  setSort(value: 'name' | 'site_id'): void {
    this.sortBy = value;
    this.sortMenuItems[0].icon = value === 'name' ? 'pi pi-check' : 'pi pi-fw';
    this.sortMenuItems[1].icon = value === 'site_id' ? 'pi pi-check' : 'pi pi-fw';
  }
  readings: { [site_id: string]: SiteDataReading } = {};
  plcSnapshots: { [site_id: string]: PlcSnapshot } = {};

  get sortedSites(): Site[] {
    return [...this.sites].sort((a, b) =>
      this.sortBy === 'name'
        ? a.name.localeCompare(b.name)
        : a.site_id.localeCompare(b.site_id)
    );
  }
  private wsSubscription?: Subscription;
  private siteDataSubscription?: Subscription;
  private plcSnapshotSubscription?: Subscription;

  constructor(
    private tenantService: TenantService,
    private userService: UserService,
    private webSocketService: WebSocketService,
    private siteService: SiteService,
    private messageService: MessageService,
  ) { }

  ngOnInit(): void {
    this.userService.appUser$.pipe(
      filter(user => !!user),
      take(1)
    ).subscribe(appUser => {
      this.lastTenantId = appUser!.tenant_id;
      this.lastAllowedSiteIds = new Set(appUser!.site_ids);
      this.loadTenant(this.lastTenantId, this.lastAllowedSiteIds);
    });

    this.userService.appUserLoadFailed$.pipe(
      filter(failed => failed),
      take(1)
    ).subscribe(() => {
      this.loading = false;
      this.loadError = true;
      this.messageService.add({
        severity: 'error',
        summary: 'Failed to load sites',
        detail: 'The server encountered an error loading your profile. Please refresh the page.',
        life: 8000,
      });
    });

    this.siteDataSubscription = this.webSocketService.siteData$.subscribe(reading => {
      this.readings = { ...this.readings, [reading.site_id]: reading };
    });

    this.plcSnapshotSubscription = this.webSocketService.plcSnapshot$.subscribe(snapshot => {
      this.plcSnapshots = { ...this.plcSnapshots, [snapshot.site_id]: snapshot };
    });
  }

  private loadTenant(tenantId: number, allowedSiteIds: Set<string>): void {
    this.tenantService.getTenantById(tenantId).subscribe({
      next: (t) => {
        this.tenant = t;
        this.sites = t.sites
          .filter((s: TenantSite) => allowedSiteIds.has(s.site_id))
          .map((s: TenantSite) => ({
            site_id: s.site_id,
            name: s.name,
            connection_status: this.mapConnectionStatus(s.connection_status),
            app_version: s.app_version,
          }));
        this.loading = false;

        this.siteService.getLatestReadings(t.tenant_id).subscribe({
          next: (response) => {
            const map: { [site_id: string]: SiteDataReading } = {};
            for (const r of response.sites) {
              map[r.site_id] = r;
            }
            this.readings = map;
          },
          error: (err) => console.error('Failed to load latest readings:', err)
        });

        this.subscribedSites = t.sites.map(s => ({ tenantId: t.tenant_id, siteId: s.site_id }));
        for (const { tenantId, siteId } of this.subscribedSites) {
          this.webSocketService.subscribeSite(tenantId, siteId);
        }

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
        this.loading = false;
        this.loadError = true;
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to load sites',
          detail: error?.error?.message ?? 'The server encountered an error. Please try again.',
          life: 8000,
        });
      }
    });
  }

  retry(): void {
    this.loading = true;
    this.loadError = false;
    if (this.lastTenantId && this.lastAllowedSiteIds) {
      this.loadTenant(this.lastTenantId, this.lastAllowedSiteIds);
    } else {
      // User profile itself failed — reload the page to restart the full auth flow
      window.location.reload();
    }
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
    this.siteDataSubscription?.unsubscribe();
    this.plcSnapshotSubscription?.unsubscribe();
    for (const { tenantId, siteId } of this.subscribedSites) {
      this.webSocketService.unsubscribeSite(tenantId, siteId);
    }
  }

  private mapConnectionStatus(status?: boolean): 'online' | 'warning' | 'offline' {
    if (status === true) {
      return 'online';
    }
    return 'offline';
  }

}
