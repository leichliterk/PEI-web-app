import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Site, SiteService, ConnectionLog } from '../../services/site.service';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-site-card',
    imports: [CardModule, BadgeModule, CommonModule],
    templateUrl: './site-card.component.html',
    styleUrl: './site-card.component.scss'
})
export class SiteCardComponent implements OnInit, OnDestroy {
  @Input() siteData!: Site;
  private statusCheckInterval: any;

  constructor(private siteService: SiteService, private router: Router) {}

  ngOnInit() {
    // Initial check
    this.updateConnectionStatus(this.siteData.site_id);

    // Set up periodic check every 15 seconds
    this.statusCheckInterval = setInterval(() => {
      this.updateConnectionStatus(this.siteData.site_id);
    }, 15000);
  }

  ngOnDestroy() {
    // Clear interval when component is destroyed
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
  }

  navigateToSite(): void {
    this.router.navigate(['/site', this.siteData.site_id]);
  }

  updateConnectionStatus(site_id: number): void {
    if (!this.siteData?.site_id) {
      return;
    }

    this.siteService.getLastConnectionLogs(this.siteData.site_id, 50).subscribe({
      next: (response: any) => {
        // Extract the logs array from the response object
        const logs = response.logs;

        // Ensure logs is an array
        if (!Array.isArray(logs)) {
          console.warn('Connection logs is not an array:', logs);
          this.siteData.connection_status = 'offline';
          return;
        }

        // Check current connection status with three states
        const now = Date.now();
        const oneMinuteAgo = new Date(now - 1 * 60 * 1000);
        const twoMinutesAgo = new Date(now - 2 * 60 * 1000);

        // Find the most recent successful connection
        const lastSuccessfulConnection = logs
          .filter((log: ConnectionLog) => log.status === 'success')
          .map((log: ConnectionLog) => new Date(log.timestamp))
          .sort((a, b) => b.getTime() - a.getTime())[0];

        if (!lastSuccessfulConnection) {
          // No successful connections found
          this.siteData.connection_status = 'offline';
        } else if (lastSuccessfulConnection >= oneMinuteAgo) {
          // Successful connection within last minute - online
          this.siteData.connection_status = 'online';
        } else if (lastSuccessfulConnection >= twoMinutesAgo) {
          // Successful connection between 1-2 minutes - warning
          this.siteData.connection_status = 'warning';
        } else {
          // No successful connection in last 2 minutes - offline
          this.siteData.connection_status = 'offline';
        }

      },
      error: (error) => {
        console.error('Error fetching connection logs:', error);
        // Set connection_status to offline on error
        this.siteData.connection_status = 'offline';
      }
    });
  }
}
