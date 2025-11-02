import { Component, Input } from '@angular/core';
import { Site, SiteService, ConnectionLog } from '../../services/site.service';

@Component({
  selector: 'app-site',
  standalone: true,
  imports: [],
  templateUrl: './site.component.html',
  styleUrl: './site.component.scss'
})
export class SiteComponent {
  @Input() siteData!: Site;

  constructor(private siteService: SiteService) {}

  ngOnInit() {
    this.updateConnectionStatus(this.siteData.site_id);
  }

  updateConnectionStatus(site_id: number): void {
    if (!this.siteData?.site_id) {
      return;
    }

    this.siteService.getLastConnectionLogs(this.siteData.site_id).subscribe({
      next: (response: any) => {
        // Extract the logs array from the response object
        const logs = response.logs;

        // Ensure logs is an array
        if (!Array.isArray(logs)) {
          console.warn('Connection logs is not an array:', logs);
          this.siteData.connection_status = false;
          return;
        }

        // Count how many of the last 5 connections have status 'true' or are successful
        const successfulConnections = logs.filter(log => log.status === 'success').length;

        // If at least 2 of the last 5 connections are true, set connection_status to true
        this.siteData.connection_status = successfulConnections >= 2;
        console.log(successfulConnections);
      },
      error: (error) => {
        console.error('Error fetching connection logs:', error);
        // Optionally set connection_status to false on error
        this.siteData.connection_status = false;
      }
    });
  }
}
