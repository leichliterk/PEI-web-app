import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { Site, SiteDataReading, SiteService } from '../../services/site.service';
import { PlcSnapshot } from '../../services/websocket.service';
import { SiteCardComponent } from '../site-card/site-card.component';
import { CommonModule } from '@angular/common';
import { TenantService, Tenant, TenantSite } from '../../services/tenant.service';
import { WebSocketService } from '../../services/websocket.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
    selector: 'app-home',
    imports: [CommonModule, SiteCardComponent, ProgressSpinnerModule, ButtonModule, MenuModule],
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
  tenant: undefined | Tenant;
  sites: Site[] = [];
  private joinedRooms: string[] = [];
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
  readings: { [site_id: number]: SiteDataReading } = {};
  plcSnapshots: { [site_id: number]: PlcSnapshot } = {};

  get sortedSites(): Site[] {
    return [...this.sites].sort((a, b) =>
      this.sortBy === 'name'
        ? a.name.localeCompare(b.name)
        : a.site_id - b.site_id
    );
  }
  private wsSubscription?: Subscription;
  private siteDataSubscription?: Subscription;
  private plcSnapshotSubscription?: Subscription;

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
          app_version: s.app_version,
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

        this.joinedRooms = t.sites.map(s => `site:${t.tenant_id}:${s.site_id}`);
        for (const room of this.joinedRooms) {
          this.webSocketService.joinRoom(room);
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
      }
    });

    this.siteDataSubscription = this.webSocketService.siteData$.subscribe(reading => {
      this.readings = { ...this.readings, [reading.site_id]: reading };
    });

    this.plcSnapshotSubscription = this.webSocketService.plcSnapshot$.subscribe(snapshot => {
      this.plcSnapshots = { ...this.plcSnapshots, [snapshot.site_id]: snapshot };
    });
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
    this.siteDataSubscription?.unsubscribe();
    this.plcSnapshotSubscription?.unsubscribe();
    for (const room of this.joinedRooms) {
      this.webSocketService.leaveRoom(room);
    }
  }

  private mapConnectionStatus(status?: boolean): 'online' | 'warning' | 'offline' {
    if (status === true) {
      return 'online';
    }
    return 'offline';
  }

}
