import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { TenantService, TenantSite } from '../../services/tenant.service';
import { WebSocketService, ServiceStatus, FtpStatus } from '../../services/websocket.service';
import { environment } from '../../../environments/environment';

interface SiteStatus {
  site_id: number;
  name: string;
  connected: boolean;
  service: ServiceStatus;
  ftp: FtpStatus;
}

@Component({
  selector: 'app-site-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    SelectModule,
    ToastModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './site-management.component.html',
  styleUrl: './site-management.component.scss'
})
export class SiteManagementComponent implements OnInit, OnDestroy {
  sites: TenantSite[] = [];
  selectedSiteId: number | null = null;
  siteStatus: SiteStatus | null = null;
  statusLoading = false;

  serviceActionLoading: string | null = null;  // 'start' | 'stop' | 'restart'
  ftpActionLoading: string | null = null;       // 'pause' | 'resume' | 'full-upload'

  private currentRoom: string | null = null;
  private serviceStatusSub?: Subscription;
  private ftpStatusSub?: Subscription;

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private userService: UserService,
    private tenantService: TenantService,
    private wsService: WebSocketService
  ) {}

  ngOnInit(): void {
    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId) return;

    this.tenantService.getTenantById(tenantId).subscribe({
      next: tenant => { this.sites = tenant.sites; },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load sites' })
    });

    this.serviceStatusSub = this.wsService.serviceStatus$.subscribe(data => {
      if (this.siteStatus) {
        this.siteStatus = { ...this.siteStatus, service: { ...this.siteStatus.service, ...data } };
      }
    });

    this.ftpStatusSub = this.wsService.ftpStatus$.subscribe(data => {
      if (this.siteStatus) {
        this.siteStatus = { ...this.siteStatus, ftp: { ...this.siteStatus.ftp, ...data } };
      }
    });
  }

  onSiteSelected(): void {
    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId || !this.selectedSiteId) return;

    if (this.currentRoom) {
      this.wsService.leaveRoom(this.currentRoom);
    }

    this.currentRoom = `site:${tenantId}:${this.selectedSiteId}`;
    this.wsService.joinRoom(this.currentRoom);
    this.loadStatus(tenantId, this.selectedSiteId);
  }

  private loadStatus(tenantId: number, siteId: number): void {
    this.statusLoading = true;
    this.siteStatus = null;
    this.http.get<SiteStatus>(`${environment.API_SERVER}/site-management/${tenantId}/${siteId}/status`).subscribe({
      next: status => {
        this.siteStatus = status;
        this.statusLoading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load site status' });
        this.statusLoading = false;
      }
    });
  }

  sendServiceCommand(action: 'start' | 'stop' | 'restart'): void {
    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId || !this.selectedSiteId) return;

    this.serviceActionLoading = action;
    this.http.post<{ success: boolean; error: string | null }>(
      `${environment.API_SERVER}/site-management/${tenantId}/${this.selectedSiteId}/service/${action}`, {}
    ).subscribe({
      next: res => {
        this.serviceActionLoading = null;
        if (!res.success) {
          this.messageService.add({ severity: 'error', summary: 'Command Failed', detail: res.error ?? 'Unknown error' });
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: `Failed to send ${action} command` });
        this.serviceActionLoading = null;
      }
    });
  }

  sendFtpCommand(action: 'pause' | 'resume' | 'full-upload'): void {
    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId || !this.selectedSiteId) return;

    this.ftpActionLoading = action;
    this.http.post<{ success: boolean; error: string | null }>(
      `${environment.API_SERVER}/site-management/${tenantId}/${this.selectedSiteId}/ftp/${action}`, {}
    ).subscribe({
      next: res => {
        this.ftpActionLoading = null;
        if (res.success) {
          this.messageService.add({ severity: 'success', summary: 'Done', detail: `FTP ${action} sent` });
        } else {
          this.messageService.add({ severity: 'error', summary: 'Command Failed', detail: res.error ?? 'Unknown error' });
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: `Failed to send FTP ${action} command` });
        this.ftpActionLoading = null;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.currentRoom) {
      this.wsService.leaveRoom(this.currentRoom);
    }
    this.serviceStatusSub?.unsubscribe();
    this.ftpStatusSub?.unsubscribe();
  }
}