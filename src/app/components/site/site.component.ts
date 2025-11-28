import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ChartModule } from 'primeng/chart';
import { Site, SiteService, ConnectionLog } from '../../services/site.service';

interface DailyStats {
  date: string;
  successes: number;
  failures: number;
  noData: number;
}

@Component({
  selector: 'app-site',
  imports: [CommonModule, CardModule, ButtonModule, BadgeModule, ChartModule],
  templateUrl: './site.component.html',
  styleUrl: './site.component.scss',
})
export class SiteComponent implements OnInit, OnDestroy {
  siteId: number | null = null;
  siteData: Site | null = null;
  loading: boolean = true;
  connectionLogs: ConnectionLog[] = [];
  logsLoading: boolean = false;
  chartData: any;
  chartOptions: any;
  private statusCheckInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private siteService: SiteService
  ) {
    this.initializeChartOptions();
  }

  ngOnInit(): void {
    // Access router state via history
    const state = history.state as { siteData?: Site };

    if (state?.siteData) {
      // Use the data passed from site-card
      this.siteData = state.siteData;
      this.siteId = state.siteData.site_id;
      this.loading = false;
      this.loadConnectionLogs();
      this.startStatusChecks();
    } else {
      // Fallback: get site ID from route params
      this.route.params.subscribe(params => {
        this.siteId = +params['id'];
        this.loadSiteData();
        this.loadConnectionLogs();
        this.startStatusChecks();
      });
    }
  }

  ngOnDestroy(): void {
    // Clear interval when component is destroyed
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
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

  loadConnectionLogs(): void {
    if (!this.siteId) return;

    this.logsLoading = true;
    // 30 days * 24 hours * 60 minutes * 4 logs per minute (every 15 seconds) = 172,800 logs
    const thirtyDaysLimit = 172800;

    this.siteService.getLastConnectionLogs(this.siteId, thirtyDaysLimit).subscribe({
      next: (response: any) => {
        // Extract the logs array from the response object
        const logs = response.logs;

        if (Array.isArray(logs)) {
          // Filter logs to only include those from the last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          this.connectionLogs = logs
            .filter((log: ConnectionLog) => new Date(log.timestamp) >= thirtyDaysAgo)
            .map((log: ConnectionLog) => ({
              ...log,
              timestamp: new Date(log.timestamp)
            }));

          // Process logs into daily statistics for chart
          this.processLogsForChart();
        } else {
          console.warn('Connection logs is not an array:', logs);
          this.connectionLogs = [];
        }
        this.logsLoading = false;
      },
      error: (error) => {
        console.error('Error fetching connection logs:', error);
        this.connectionLogs = [];
        this.logsLoading = false;
      }
    });
  }

  processLogsForChart(): void {
    const EXPECTED_LOGS_PER_DAY = 5760; // 24 hours * 60 minutes * 4 logs per minute

    // Group logs by day
    const dailyStatsMap = new Map<string, DailyStats>();

    // Initialize last 30 days with zero counts
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyStatsMap.set(dateKey, {
        date: dateKey,
        successes: 0,
        failures: 0,
        noData: EXPECTED_LOGS_PER_DAY
      });
    }

    // Count successes and failures per day
    this.connectionLogs.forEach(log => {
      const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
      const stats = dailyStatsMap.get(dateKey);

      if (stats) {
        if (log.status === 'success') {
          stats.successes++;
        } else {
          stats.failures++;
        }
      }
    });

    // Calculate noData (missing logs) for each day
    dailyStatsMap.forEach(stats => {
      stats.noData = EXPECTED_LOGS_PER_DAY - (stats.successes + stats.failures);
      if (stats.noData < 0) stats.noData = 0;
    });

    // Convert to array and sort by date
    const dailyStatsArray = Array.from(dailyStatsMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Prepare chart data
    this.chartData = {
      labels: dailyStatsArray.map(stat => {
        const date = new Date(stat.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Failures',
          data: dailyStatsArray.map(stat => stat.failures),
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          borderWidth: 1
        },
        {
          label: 'Successes',
          data: dailyStatsArray.map(stat => stat.successes),
          backgroundColor: '#22c55e',
          borderColor: '#16a34a',
          borderWidth: 1
        },
        {
          label: 'No Data',
          data: dailyStatsArray.map(stat => stat.noData),
          backgroundColor: '#9ca3af',
          borderColor: '#6b7280',
          borderWidth: 1
        }
      ]
    };
  }

  initializeChartOptions(): void {
    this.chartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            display: false
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          max: 5760,
          ticks: {
            stepSize: 1000
          },
          title: {
            display: true,
            text: 'Number of Connection Attempts'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          callbacks: {
            title: (tooltipItems: any) => {
              return tooltipItems[0].label;
            },
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y || 0;
              const percentage = ((value / 5760) * 100).toFixed(1);
              return `${label}: ${value.toLocaleString()} (${percentage}%)`;
            },
            footer: (tooltipItems: any) => {
              const total = tooltipItems.reduce((sum: number, item: any) => sum + item.parsed.y, 0);
              const percentage = ((total / 5760) * 100).toFixed(1);
              return `\nTotal: ${total.toLocaleString()} / 5,760 (${percentage}%)`;
            }
          }
        }
      }
    };
  }

  startStatusChecks(): void {
    if (!this.siteId || !this.siteData) return;

    // Initial status check
    this.updateConnectionStatus();

    // Set up periodic check every 15 seconds
    this.statusCheckInterval = setInterval(() => {
      this.updateConnectionStatus();
    }, 15000);
  }

  updateConnectionStatus(): void {
    if (!this.siteId || !this.siteData) return;

    this.siteService.getLastConnectionLogs(this.siteId, 50).subscribe({
      next: (response: any) => {
        // Extract the logs array from the response object
        const logs = response.logs;

        // Ensure logs is an array
        if (!Array.isArray(logs)) {
          console.warn('Connection logs is not an array:', logs);
          this.siteData!.connection_status = 'offline';
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
          this.siteData!.connection_status = 'offline';
        } else if (lastSuccessfulConnection >= oneMinuteAgo) {
          // Successful connection within last minute - online
          this.siteData!.connection_status = 'online';
        } else if (lastSuccessfulConnection >= twoMinutesAgo) {
          // Successful connection between 1-2 minutes - warning
          this.siteData!.connection_status = 'warning';
        } else {
          // No successful connection in last 2 minutes - offline
          this.siteData!.connection_status = 'offline';
        }
      },
      error: (error) => {
        console.error('Error fetching connection logs for status update:', error);
        // Set connection_status to offline on error
        if (this.siteData) {
          this.siteData.connection_status = 'offline';
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
