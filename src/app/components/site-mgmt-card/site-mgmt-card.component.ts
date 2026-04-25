import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { TenantSite } from '../../services/tenant.service';
import { ServiceStatus } from '../../services/websocket.service';

interface SiteStatusResponse {
  site_id: number;
  connected: boolean;
  service: ServiceStatus;
}

@Component({
  selector: 'app-site-mgmt-card',
  standalone: true,
  imports: [CommonModule, CardModule, BadgeModule, ButtonModule],
  templateUrl: './site-mgmt-card.component.html',
  styleUrl: './site-mgmt-card.component.scss'
})
export class SiteMgmtCardComponent {
  @Input() site!: TenantSite;
  @Input() siteStatus?: SiteStatusResponse;
  @Input() latestOtaVersion: string | null = null;
  @Input() restartLoading = false;
  @Input() installLoading = false;

  @Output() restartService = new EventEmitter<number>();
  @Output() installOta = new EventEmitter<number>();

  get hasUpdate(): boolean {
    return !!this.site.app_version && !!this.latestOtaVersion
      && this.site.app_version !== this.latestOtaVersion;
  }

  get isOnline(): boolean {
    return this.site.connection_status === true;
  }

  get serviceSeverity(): 'success' | 'danger' | 'secondary' {
    if (!this.isOnline) return 'secondary';
    if (this.siteStatus?.service.state === 'stopped') return 'danger';
    return 'success';
  }

  get serviceLabel(): string {
    if (!this.isOnline) return 'Offline';
    if (this.siteStatus?.service.state === 'stopped') return 'Stopped';
    return 'Running';
  }
}
