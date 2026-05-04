import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { Site, SiteDataReading, SiteFile, SiteService, SiteUptime } from '../../services/site.service';
import { PlcSnapshot, WebSocketService } from '../../services/websocket.service';
import { UIChart } from 'primeng/chart';

@Component({
  selector: 'app-site',
  imports: [CommonModule, CardModule, ButtonModule, BadgeModule, ChartModule, ProgressSpinnerModule, DialogModule, TableModule, InputTextModule],
  templateUrl: './site.component.html',
  styleUrl: './site.component.scss',
})
export class SiteComponent implements OnInit, OnDestroy {
  @ViewChild('snapshotChart') snapshotChart?: UIChart;

  siteId: number | null = null;
  siteData: Site | null = null;
  loading: boolean = true;
  connectedAt: Date | null = null;
  connectionSource: string | null = null;
  uptime: string = '--';
  uptimeData: SiteUptime | null = null;
  chartData: any;
  chartOptions: any;
  accountingLogs: SiteFile[] = [];
  flareData: SiteFile[] = [];
  crFiles: SiteFile[] = [];
  allAccountingLogs: SiteFile[] = [];
  allFlareData: SiteFile[] = [];
  allCrFiles: SiteFile[] = [];
  accountingLogsLoading: boolean = true;
  flareDataLoading: boolean = true;
  crFilesLoading: boolean = true;
  fileDialogVisible: boolean = false;
  fileDialogTitle: string = '';
  fileDialogFiles: SiteFile[] = [];
  reading: SiteDataReading | undefined;
  plcSnapshot: PlcSnapshot | undefined;
  snapshots: PlcSnapshot[] = [];
  snapshotChartData: any;
  snapshotChartOptions: any;
  snapshotsLoading = true;
  private wsSubscription?: Subscription;
  private siteDataSubscription?: Subscription;
  private plcSnapshotSubscription?: Subscription;
  private uptimeInterval?: Subscription;

  get offline(): boolean { return this.siteData?.connection_status !== 'online'; }

  get flareStatus(): 'running' | 'alarm' | 'shutdown' {
    if (this.reading?.flare_status) return this.reading.flare_status;
    if (!this.reading || this.reading.flr_flow === 0) return 'shutdown';
    return 'running';
  }

  private tagValue(displayName: string): number | null {
    const tag = this.plcSnapshot?.tags.find(t => t.displayName === displayName);
    if (tag && !tag.error && typeof tag.value === 'number') return tag.value;
    return null;
  }

  get mmBtuHr(): number | null {
    return this.tagValue('MMBTU/hr')
      ?? (this.reading ? (this.reading.flr_flow * 60 * 1011 * this.reading.ch4) / 100000000 : null);
  }
  get ch4(): number | null { return this.tagValue('CH4') ?? this.reading?.ch4 ?? null; }
  get o2(): number | null { return this.tagValue('O2') ?? this.reading?.o2 ?? null; }
  get flrFlow(): number | null { return this.tagValue('Flare flow') ?? this.reading?.flr_flow ?? null; }
  get inletPressure(): number | null { return this.tagValue('Inlet pressure') ?? this.reading?.inlet_pressure ?? null; }
  get flrSdv(): number | null { return this.tagValue('Shutdown valve') ?? (this.reading?.flr_sdv != null ? this.reading.flr_sdv : null); }
  get lastTimestamp(): string | null { return this.plcSnapshot?.timestamp ?? this.reading?.timestamp ?? null; }

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
      this.loadSiteFiles();
      this.loadLatestReading();
    } else {
      // Fallback: get site ID from route params
      this.route.params.subscribe(params => {
        this.siteId = +params['id'];
        this.loadSiteData();
        this.subscribeToStatusUpdates();
        this.loadUptimeData();
        this.loadSiteFiles();
        this.loadLatestReading();
      });
    }
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
    this.siteDataSubscription?.unsubscribe();
    this.plcSnapshotSubscription?.unsubscribe();
    this.uptimeInterval?.unsubscribe();
    if (this.siteId) this.webSocketService.unsubscribeSite(1001, this.siteId);
  }

  private loadLatestReading(): void {
    const tenantId = 1001;
    this.siteService.getLatestReadings(tenantId).subscribe({
      next: (response) => {
        this.reading = response.sites.find(r => r.site_id === this.siteId);
      },
      error: (err) => console.error('Failed to load latest reading:', err)
    });

    this.siteDataSubscription = this.webSocketService.siteData$.subscribe(r => {
      if (r.site_id === this.siteId) this.reading = r;
    });

    if (this.siteId) {
      this.webSocketService.subscribeSite(tenantId, this.siteId);

      this.siteService.getSiteSnapshots(tenantId, this.siteId, 60).subscribe({
        next: snapshots => {
          this.snapshots = snapshots;
          this.buildSnapshotChartData();
          this.snapshotsLoading = false;
        },
        error: err => {
          console.error('Failed to load PLC snapshots:', err);
          this.snapshotsLoading = false;
        }
      });
    }

    this.plcSnapshotSubscription = this.webSocketService.plcSnapshot$.subscribe(snapshot => {
      if (snapshot.site_id !== this.siteId) return;
      this.plcSnapshot = snapshot;
      this.snapshots = [...this.snapshots.slice(1), snapshot];
      this.buildSnapshotChartData();
    });
  }

  private buildSnapshotChartData(): void {
    if (!this.snapshots.length) return;

    const palette = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ];

    const tagNames: string[] = [];
    for (const snap of this.snapshots) {
      for (const tag of snap.tags) {
        const name = tag.displayName ?? tag.name;
        if (name && !tagNames.includes(name) && !tag.error && typeof tag.value === 'number') {
          tagNames.push(name);
        }
      }
    }

    const labels = this.snapshots.map(s =>
      new Date(s.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );

    const dataForTag = (name: string) => this.snapshots.map(snap => {
      const tag = snap.tags.find(t => (t.displayName ?? t.name) === name);
      return tag && !tag.error && typeof tag.value === 'number' ? tag.value : null;
    });

    if (!this.snapshotChartData) {
      // Initial build — create full structure and options
      const scales: any = {
        x: { ticks: { maxTicksLimit: 12, maxRotation: 0 } },
      };

      const datasets = tagNames.map((name, i) => {
        const axisId = `y_${i}`;
        scales[axisId] = { type: 'linear', display: false, beginAtZero: false, grace: '50%' };
        const unit = this.snapshots.at(-1)?.tags.find(t => (t.displayName ?? t.name) === name)?.unit ?? null;
        return {
          label: name,
          unit,
          yAxisID: axisId,
          data: dataForTag(name),
          borderColor: palette[i % palette.length],
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          spanGaps: true,
        };
      });

      this.snapshotChartData = { labels, datasets };
      this.snapshotChartOptions = {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              generateLabels: (chart: any) => chart.data.datasets.map((ds: any, i: number) => ({
                text: ds.label,
                fillStyle: ds.borderColor,
                strokeStyle: ds.borderColor,
                lineWidth: 0,
                hidden: !chart.isDatasetVisible(i),
                datasetIndex: i,
              }))
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              labelColor: (context: any) => ({
                borderColor: context.dataset.borderColor,
                backgroundColor: context.dataset.borderColor,
              }),
              label: (context: any) => {
                const ds = context.dataset;
                const value = context.parsed.y;
                if (value == null) return '';
                const unit = ds.unit ? ` ${ds.unit}` : '';
                return `${ds.label}: ${value}${unit}`;
              }
            }
          },
        },
        scales,
      };
    } else {
      // Subsequent updates — mutate Chart.js instance directly, bypassing Angular binding
      const chartJs = this.snapshotChart?.chart;
      if (chartJs) {
        chartJs.data.labels = labels;
        for (const ds of chartJs.data.datasets) {
          ds.data = dataForTag(ds.label as string);
        }
        chartJs.update('none'); // 'none' skips animation for live updates
      }
    }
  }

  private subscribeToStatusUpdates(): void {
    this.wsSubscription = this.webSocketService.siteStatus$.subscribe(update => {
      if (this.siteData && update.site_id === this.siteData.site_id) {
        const newStatus = update.connection_status ? 'online' : 'offline';
        const wasOnline = this.siteData.connection_status === 'online';

        this.siteData = {
          ...this.siteData,
          connection_status: newStatus
        };

        // Handle status changes - reload uptime data to get updated session info
        if (wasOnline !== (newStatus === 'online')) {
          // Stop any existing timer
          this.uptimeInterval?.unsubscribe();
          this.uptimeInterval = undefined;
          // Reload to get the current session data from API
          this.loadUptimeData();
        }
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

    this.siteService.getSiteUptime(tenantId, this.siteId, 30).subscribe({
      next: (data) => {
        this.uptimeData = data;
        this.processCurrentSession();
        this.buildChartData();
      },
      error: (error) => {
        console.error('Failed to load uptime data:', error);
      }
    });
  }

  private loadSiteFiles(): void {
    if (!this.siteId) return;

    const tenantId = 1001;

    this.siteService.getSiteFiles(tenantId, this.siteId).subscribe({
      next: (files) => {
        const sorted = files.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
        this.allAccountingLogs = sorted.filter(f => f.category === 'accounting_log');
        this.allFlareData = sorted.filter(f => f.category === 'flare_data');
        this.allCrFiles = sorted.filter(f => f.category === 'cr_files');
        this.accountingLogs = this.allAccountingLogs.slice(0, 5);
        this.flareData = this.allFlareData.slice(0, 5);
        this.crFiles = this.allCrFiles.slice(0, 5);
        this.accountingLogsLoading = false;
        this.flareDataLoading = false;
        this.crFilesLoading = false;
      },
      error: (error) => {
        console.error('Failed to load site files:', error);
        this.accountingLogsLoading = false;
        this.flareDataLoading = false;
        this.crFilesLoading = false;
      }
    });
  }

  downloadFile(file: SiteFile): void {
    this.siteService.downloadFile(file._id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Failed to download file:', error);
      }
    });
  }

  showAllFiles(category: 'accounting_log' | 'flare_data' | 'cr_files'): void {
    const titles: Record<string, string> = {
      accounting_log: 'Accounting Logs',
      flare_data: 'Flare Data',
      cr_files: 'CR Files'
    };
    const allFiles: Record<string, SiteFile[]> = {
      accounting_log: this.allAccountingLogs,
      flare_data: this.allFlareData,
      cr_files: this.allCrFiles
    };
    this.fileDialogTitle = titles[category];
    this.fileDialogFiles = allFiles[category];
    this.fileDialogVisible = true;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private buildChartData(): void {
    if (!this.uptimeData) return;

    const days = 30;
    const now = new Date();
    const currentHourOfDay = now.getHours() + now.getMinutes() / 60;
    const labels: string[] = [];

    // Build day labels
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    // For each day, calculate connected time ranges
    const dailyConnectedRanges: Array<Array<[number, number]>> = [];

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - (days - 1 - i));
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const connectedRanges: Array<[number, number]> = [];

      if (this.uptimeData.sessions) {
        for (const session of this.uptimeData.sessions) {
          const startTime = new Date(session.connected_at);
          const endTime = session.disconnected_at ? new Date(session.disconnected_at) : new Date();

          // Check if session overlaps with this day
          if (startTime <= dayEnd && endTime >= dayStart) {
            const overlapStart = Math.max(startTime.getTime(), dayStart.getTime());
            const overlapEnd = Math.min(endTime.getTime(), dayEnd.getTime());

            // Convert to hours of the day
            const startHour = (overlapStart - dayStart.getTime()) / (1000 * 60 * 60);
            const endHour = (overlapEnd - dayStart.getTime()) / (1000 * 60 * 60);

            connectedRanges.push([startHour, endHour]);
          }
        }
      }

      // Sort and merge overlapping ranges
      connectedRanges.sort((a, b) => a[0] - b[0]);
      const mergedRanges: Array<[number, number]> = [];
      for (const range of connectedRanges) {
        if (mergedRanges.length === 0 || mergedRanges[mergedRanges.length - 1][1] < range[0]) {
          mergedRanges.push(range);
        } else {
          mergedRanges[mergedRanges.length - 1][1] = Math.max(mergedRanges[mergedRanges.length - 1][1], range[1]);
        }
      }

      dailyConnectedRanges.push(mergedRanges);
    }

    // Find maximum number of segments needed for any day
    let maxSegments = 0;
    for (const ranges of dailyConnectedRanges) {
      // Disconnected segments = connected segments + 1 (or 1 if no connected)
      const disconnectedCount = ranges.length === 0 ? 1 : ranges.length + 1;
      maxSegments = Math.max(maxSegments, ranges.length, disconnectedCount);
    }

    // Build datasets for connected and disconnected segments
    const connectedDatasets: any[] = [];
    const disconnectedDatasets: any[] = [];

    for (let seg = 0; seg < maxSegments; seg++) {
      connectedDatasets.push({
        label: seg === 0 ? 'Connected' : '',
        backgroundColor: '#22c55e',
        data: new Array(days).fill(null),
        barPercentage: 0.9,
        categoryPercentage: 0.8
      });
      disconnectedDatasets.push({
        label: seg === 0 ? 'Disconnected' : '',
        backgroundColor: 'rgba(185, 28, 28, 0.75)',
        data: new Array(days).fill(null),
        barPercentage: 0.9,
        categoryPercentage: 0.8
      });
    }

    // Fill in the data for each day
    for (let dayIdx = 0; dayIdx < days; dayIdx++) {
      const connectedRanges = dailyConnectedRanges[dayIdx];
      const isToday = dayIdx === days - 1;
      const maxHour = isToday ? currentHourOfDay : 24;

      if (connectedRanges.length === 0) {
        // Entire day disconnected (only up to current hour if today)
        disconnectedDatasets[0].data[dayIdx] = [0, maxHour];
      } else {
        // Build alternating disconnected/connected segments
        let currentHour = 0;
        let disconnectedIdx = 0;
        let connectedIdx = 0;

        for (const [start, end] of connectedRanges) {
          // Disconnected segment before this connected range
          if (currentHour < start) {
            disconnectedDatasets[disconnectedIdx].data[dayIdx] = [currentHour, start];
            disconnectedIdx++;
          }

          // Connected segment
          connectedDatasets[connectedIdx].data[dayIdx] = [start, end];
          connectedIdx++;
          currentHour = end;
        }

        // Final disconnected segment after last connected range (only up to current hour if today)
        if (currentHour < maxHour) {
          disconnectedDatasets[disconnectedIdx].data[dayIdx] = [currentHour, maxHour];
        }
      }
    }

    // Combine datasets (interleave disconnected and connected for proper stacking)
    const allDatasets = [...disconnectedDatasets, ...connectedDatasets];

    this.chartData = {
      labels: labels,
      datasets: allDatasets
    };

    this.chartOptions = {
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            filter: (item: any) => item.text !== ''
          }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const value = context.raw;
              if (!value) return '';
              const formatTime = (hours: number) => {
                const h = Math.floor(hours);
                const m = Math.floor((hours - h) * 60);
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              };
              const startTime = formatTime(value[0]);
              const endTime = formatTime(value[1]);
              const label = context.dataset.label || (context.dataset.backgroundColor === '#22c55e' ? 'Connected' : 'Disconnected');
              return `${label}: ${startTime} - ${endTime}`;
            },
            afterBody: (contexts: any[]) => {
              if (!contexts.length) return '';
              const dayIdx = contexts[0].dataIndex;
              const ranges = dailyConnectedRanges[dayIdx];
              const isToday = dayIdx === days - 1;
              const totalHours = isToday ? currentHourOfDay : 24;
              let totalUptime = 0;
              for (const [start, end] of ranges) {
                totalUptime += end - start;
              }
              const uptimePercentage = (totalUptime / totalHours) * 100;
              return `\nUptime: ${uptimePercentage.toFixed(3)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          min: 0,
          max: 24,
          title: {
            display: true,
            text: 'Time of Day'
          },
          ticks: {
            stepSize: 4,
            callback: (value: number) => `${value}:00`
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    };
  }

  private processCurrentSession(): void {
    // Stop any existing interval first
    this.uptimeInterval?.unsubscribe();
    this.uptimeInterval = undefined;

    if (!this.uptimeData?.sessions?.length) {
      this.connectedAt = null;
      this.connectionSource = null;
      this.uptime = '--';
      return;
    }

    // Find the active session (disconnected_at is null)
    const activeSession = this.uptimeData.sessions.find(s => s.disconnected_at === null);

    if (activeSession) {
      this.connectedAt = new Date(activeSession.connected_at);
      this.connectionSource = activeSession.connection_source;
      this.updateUptime();
      this.uptimeInterval = interval(1000).subscribe(() => this.updateUptime());
    } else {
      // No active session
      const lastSession = this.uptimeData.sessions[this.uptimeData.sessions.length - 1];
      this.connectedAt = new Date(lastSession.connected_at);
      this.connectionSource = 'offline';
      this.uptime = lastSession.duration_ms !== null ? this.formatDuration(lastSession.duration_ms) : '--';
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
