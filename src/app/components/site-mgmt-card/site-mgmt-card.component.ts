import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { TenantSite } from '../../services/tenant.service';
import { ServiceStatus } from '../../services/websocket.service';

interface SiteStatusResponse {
  site_id: string;
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

  @Output() restartService = new EventEmitter<string>();
  @Output() installOta = new EventEmitter<string>();

  get hasUpdate(): boolean {
    if (!this.site.app_version || !this.latestOtaVersion) return false;
    const parse = (v: string) => v.split('.').map(n => parseInt(n, 10));
    const [aMaj, aMin, aPatch] = parse(this.latestOtaVersion);
    const [bMaj, bMin, bPatch] = parse(this.site.app_version);
    if (aMaj !== bMaj) return aMaj > bMaj;
    if (aMin !== bMin) return aMin > bMin;
    return aPatch > bPatch;
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
