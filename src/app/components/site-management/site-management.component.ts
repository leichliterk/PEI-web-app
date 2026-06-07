import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Subscription, filter, switchMap, take, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { TenantService, TenantSite } from '../../services/tenant.service';
import { SiteMgmtCardComponent } from '../site-mgmt-card/site-mgmt-card.component';
import { ServiceStatus } from '../../services/websocket.service';
import { environment } from '../../../environments/environment';

interface SiteStatusResponse {
  site_id: string;
  connected: boolean;
  service: ServiceStatus;
}

export interface OtaRelease {
  _id: string;
  version: string;
  status: 'active' | 'superseded' | 'archived';
}

@Component({
  selector: 'app-site-management',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    ProgressSpinnerModule,
    TooltipModule,
    ToastModule,
    SiteMgmtCardComponent,
  ],
  providers: [MessageService],
  templateUrl: './site-management.component.html',
  styleUrl: './site-management.component.scss'
})
export class SiteManagementComponent implements OnInit, OnDestroy {
  sites: TenantSite[] = [];
  layout: 'grid' | 'list' = 'grid';
  loading = true;
  serviceStatuses: { [siteId: string]: SiteStatusResponse } = {};
  latestOtaVersion: string | null = null;
  private latestOtaReleaseId: string | null = null;
  restartLoadingSites = new Set<string>();
  installLoadingSites = new Set<string>();

  private tenantId: number | null = null;
  private sub?: Subscription;

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private tenantService: TenantService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.sub = this.userService.appUser$.pipe(
      filter(u => !!u),
      take(1),
      switchMap(u => forkJoin({
        tenant: this.tenantService.getTenantById(u!.tenant_id),
        releases: this.http.get<OtaRelease[]>(`${environment.API_SERVER}/ota/releases/${u!.tenant_id}`)
          .pipe(catchError(err => { console.error('Failed to load OTA releases:', err); return of([] as OtaRelease[]); })),
        _tenantId: of(u!.tenant_id),
      }))
    ).subscribe({
      next: ({ tenant, releases, _tenantId }) => {
        this.tenantId = _tenantId;
        this.sites = tenant.sites;

        const active = releases.filter(r => r.status === 'active');
        this.latestOtaVersion = active.length ? active[0].version : null;
        this.latestOtaReleaseId = active.length ? active[0]._id : null;

        const statusCalls = tenant.sites.map(site =>
          this.http.get<SiteStatusResponse>(
            `${environment.API_SERVER}/site-management/${_tenantId}/${site.site_id}/status`
          ).pipe(catchError(err => { console.error(`Failed to load status for site ${site.site_id}:`, err); return of(null); }))
        );

        if (statusCalls.length) {
          forkJoin(statusCalls).subscribe(results => {
            const map: { [siteId: string]: SiteStatusResponse } = {};
            for (const r of results) {
              if (r) map[r.site_id] = r;
            }
            this.serviceStatuses = map;
          });
        }

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onRestartService(siteId: string): void {
    if (!this.tenantId) return;
    this.restartLoadingSites = new Set(this.restartLoadingSites).add(siteId);
    this.http.post<{ success: boolean; error: string | null }>(
      `${environment.API_SERVER}/site-management/${this.tenantId}/${siteId}/service/restart`, {}
    ).subscribe({
      next: res => {
        this.restartLoadingSites = new Set([...this.restartLoadingSites].filter(id => id !== siteId));
        if (!res.success) {
          this.messageService.add({ severity: 'error', summary: 'Restart Failed', detail: res.error ?? 'Unknown error' });
        } else {
          this.messageService.add({ severity: 'success', summary: 'Restart Sent', detail: `Restart command sent to site ${siteId}` });
        }
      },
      error: () => {
        this.restartLoadingSites = new Set([...this.restartLoadingSites].filter(id => id !== siteId));
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to send restart command' });
      }
    });
  }

  onInstallOta(siteId: string): void {
    if (!this.tenantId || !this.latestOtaReleaseId) return;
    this.installLoadingSites = new Set(this.installLoadingSites).add(siteId);
    this.http.post<{ success: boolean; error?: string }>(
      `${environment.API_SERVER}/ota/releases/${this.latestOtaReleaseId}/install`,
      { tenant_id: this.tenantId, site_id: siteId }
    ).subscribe({
      next: () => {
        this.installLoadingSites = new Set([...this.installLoadingSites].filter(id => id !== siteId));
        this.messageService.add({ severity: 'success', summary: 'Install Sent', detail: `OTA install initiated for site ${siteId}` });
      },
      error: err => {
        this.installLoadingSites = new Set([...this.installLoadingSites].filter(id => id !== siteId));
        const detail = err.status === 409 ? 'Site is offline' : 'Failed to send install command';
        this.messageService.add({ severity: 'error', summary: 'Install Failed', detail });
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
