import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { Site, SiteService, SiteUptime } from '../../services/site.service';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-site',
  imports: [CommonModule, CardModule, ButtonModule, BadgeModule],
  templateUrl: './site.component.html',
  styleUrl: './site.component.scss',
})
export class SiteComponent implements OnInit, OnDestroy {
  siteId: number | null = null;
  siteData: Site | null = null;
  loading: boolean = true;
  connectedAt: Date | null = null;
  uptime: string = '--';
  uptimeData: SiteUptime | null = null;
  private wsSubscription?: Subscription;
  private uptimeInterval?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private webSocketService: WebSocketService,
    private siteService: SiteService
  ) {}

  ngOnInit(): void {
    // Access router state via history
    const state = history.state as { siteData?: Site };

    if (state?.siteData) {
      // Use the data passed from site-card
      this.siteData = state.siteData;
      this.siteId = state.siteData.site_id;
      this.loading = false;
      this.subscribeToStatusUpdates();
      this.loadUptimeData();
    } else {
      // Fallback: get site ID from route params
      this.route.params.subscribe(params => {
        this.siteId = +params['id'];
        this.loadSiteData();
        this.subscribeToStatusUpdates();
        this.loadUptimeData();
      });
    }
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
    this.uptimeInterval?.unsubscribe();
  }

  private subscribeToStatusUpdates(): void {
    this.wsSubscription = this.webSocketService.siteStatus$.subscribe(update => {
      if (this.siteData && update.site_id === this.siteData.site_id) {
        this.siteData = {
          ...this.siteData,
          connection_status: update.connection_status ? 'online' : 'offline'
        };
      }
    });
  }

  loadSiteData(): void {
    if (!this.siteId) return;

    // Fallback to mock data if no state was passed
    this.siteData = {
      site_id: this.siteId,
      name: `Site ${this.siteId}`,
      connection_status: 'offline'
    };
    this.loading = false;
  }

  private loadUptimeData(): void {
    if (!this.siteId) return;

    // TODO: Get tenant_id from proper source (hardcoded for now)
    const tenantId = 1001;

    this.siteService.getSiteUptime(tenantId, this.siteId, 7).subscribe({
      next: (data) => {
        this.uptimeData = data;
        this.processCurrentSession();
      },
      error: (error) => {
        console.error('Failed to load uptime data:', error);
      }
    });
  }

  private processCurrentSession(): void {
    if (!this.uptimeData?.sessions?.length) {
      this.connectedAt = null;
      this.uptime = '--';
      return;
    }

    // Get the most recent session (last in array)
    const currentSession = this.uptimeData.sessions[this.uptimeData.sessions.length - 1];
    this.connectedAt = new Date(currentSession.connected_at);

    // If site is currently online, calculate live uptime
    if (this.siteData?.connection_status === 'online') {
      this.updateUptime();
      this.uptimeInterval = interval(1000).subscribe(() => this.updateUptime());
    } else {
      // Site is offline, show the duration from the last session
      this.uptime = this.formatDuration(currentSession.duration_ms);
    }
  }

  private updateUptime(): void {
    if (!this.connectedAt) {
      this.uptime = '--';
      return;
    }

    const now = new Date();
    const diff = now.getTime() - this.connectedAt.getTime();
    this.uptime = this.formatDuration(diff);
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
