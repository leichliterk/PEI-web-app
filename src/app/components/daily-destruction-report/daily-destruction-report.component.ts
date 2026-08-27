import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { AdminSite } from '../tenant-admin/tenant-admin.component';
import { environment } from '../../../environments/environment';

interface ReportSite {
  site_id: string;
  name: string;
}

interface SiteDataEntry {
  credits: number | null;
  uptime: number | null;
}

interface ReportResponse {
  sites: ReportSite[];
  dates: string[];
  data: { [date: string]: { [siteId: string]: SiteDataEntry | null } };
  constants: { T: number; DE: number; CF: number; PEMDF: number };
}

interface ReportRow {
  date: string;
  [siteId: string]: number | null | string;
}

interface ReportSettings {
  creditValue: number | null;
  T: number | null;
  DE: number | null;
  CF: number | null;
  PEMDF: number | null;
  carbOnly: boolean;
}

const SETTINGS_KEY = 'pei_report_settings';

const DEFAULT_SETTINGS: ReportSettings = {
  creditValue: null,
  T: null,
  DE: null,
  CF: null,
  PEMDF: null,
  carbOnly: false,
};

@Component({
  selector: 'app-daily-destruction-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    DatePickerModule,
    ToastModule,
    DialogModule,
    InputNumberModule,
    DividerModule,
    SelectButtonModule,
    ToggleSwitchModule,
  ],
  providers: [MessageService],
  templateUrl: './daily-destruction-report.component.html',
  styleUrl: './daily-destruction-report.component.scss'
})
export class DailyDestructionReportComponent implements OnInit {
  startDate: Date;
  endDate: Date;

  sites: ReportSite[] = [];
  rows: ReportRow[] = [];
  uptimeData: { [date: string]: { [siteId: string]: number | null } } = {};
  constants: { T: number; DE: number; CF: number; PEMDF: number } | null = null;
  private siteMetadata = new Map<string, AdminSite>();
  private metadataLoaded = false;

  loading = false;
  hasRun = false;
  hoveredCol: number | null = null;

  periodMode: 'current' | 'previous' | 'custom' = 'current';
  periodOptions = [
    { label: 'Current Month', value: 'current' },
    { label: 'Previous Month', value: 'previous' },
    { label: 'Custom', value: 'custom' },
  ];

  // ── Report Settings ───────────────────────────────────────────────────────
  settingsVisible = false;
  settings: ReportSettings = { ...DEFAULT_SETTINGS };
  draft: ReportSettings = { ...DEFAULT_SETTINGS };

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private userService: UserService
  ) {
    const { start, end } = this.periodDates('current');
    this.startDate = start;
    this.endDate = end;
  }

  ngOnInit(): void {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch { /* ignore */ }

    const tenantId = this.userService.appUserValue?.tenant_id;
    if (tenantId) {
      this.http.get<AdminSite[]>(`${environment.API_SERVER}/site-admin/${tenantId}/sites`)
        .subscribe({
          next: sites => {
            sites.forEach(s => this.siteMetadata.set(s.site_id, s));
            this.metadataLoaded = true;
          }
        });
    }
  }

  onPeriodChange(mode: 'current' | 'previous' | 'custom'): void {
    if (mode === 'custom') return;
    const { start, end } = this.periodDates(mode);
    this.startDate = start;
    this.endDate = end;
  }

  private periodDates(mode: 'current' | 'previous' | 'custom'): { start: Date; end: Date } {
    const now = new Date();
    if (mode === 'current') {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now),
      };
    }
    if (mode === 'previous') {
      const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      return {
        start: new Date(y, m, 1),
        end: new Date(y, m + 1, 0),
      };
    }
    return { start: this.startDate, end: this.endDate };
  }

  openSettings(): void {
    this.draft = {
      creditValue: this.settings.creditValue,
      T:        this.settings.T        ?? this.constants?.T     ?? null,
      DE:       this.settings.DE       ?? this.constants?.DE    ?? null,
      CF:       this.settings.CF       ?? this.constants?.CF    ?? null,
      PEMDF:    this.settings.PEMDF    ?? this.constants?.PEMDF ?? null,
      carbOnly: this.settings.carbOnly,
    };
    this.settingsVisible = true;
  }

  saveSettings(): void {
    this.settings = { ...this.draft };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* ignore */ }
    this.settingsVisible = false;
  }

  runReport(): void {
    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId) return;

    const start = this.formatDate(this.startDate);
    const end = this.formatDate(this.endDate);

    const params: Record<string, string> = { start, end };
    if (this.settings.T != null)     params['T']     = String(this.settings.T);
    if (this.settings.DE != null)    params['DE']    = String(this.settings.DE);
    if (this.settings.CF != null)    params['CF']    = String(this.settings.CF);
    if (this.settings.PEMDF != null) params['PEMDF'] = String(this.settings.PEMDF);

    this.loading = true;
    this.hasRun = true;

    const report$ = this.http.get<ReportResponse>(
      `${environment.API_SERVER}/reports/daily-destruction/${tenantId}`,
      { params }
    );

    const metadata$ = this.metadataLoaded
      ? undefined
      : this.http.get<AdminSite[]>(`${environment.API_SERVER}/site-admin/${tenantId}/sites`);

    const handleResponse = (res: ReportResponse) => {
        let filteredSites = res.sites.filter(s => {
          const meta = this.siteMetadata.get(s.site_id);
          return meta?.status === 'production';
        });
        if (this.settings.carbOnly) {
          filteredSites = filteredSites.filter(s => this.siteMetadata.get(s.site_id)?.carb_certified);
        }
        this.sites = filteredSites;
        this.constants = res.constants;
        const uptime: typeof this.uptimeData = {};
        this.rows = res.dates.map(date => {
          const row: ReportRow = { date };
          uptime[date] = {};
          for (const site of res.sites) {
            const entry = res.data[date]?.[site.site_id];
            row[site.site_id] = entry?.credits ?? null;
            uptime[date][site.site_id] = entry?.uptime ?? null;
          }
          return row;
        });
        this.uptimeData = uptime;
        this.loading = false;
    };

    if (metadata$) {
      forkJoin({ report: report$, metadata: metadata$ }).subscribe({
        next: ({ report, metadata }) => {
          metadata.forEach(s => this.siteMetadata.set(s.site_id, s));
          this.metadataLoaded = true;
          handleResponse(report);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load report data' });
          this.loading = false;
        }
      });
    } else {
      report$.subscribe({
        next: handleResponse,
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load report data' });
          this.loading = false;
        }
      });
    }
  }

  rowTotal(row: ReportRow): number | null {
    const values = this.sites
      .map(s => row[s.site_id] as number | null)
      .filter((v): v is number => v != null);
    return values.length ? values.reduce((a, b) => a + b, 0) : null;
  }

  rowValue(row: ReportRow): number | null {
    if (this.settings.creditValue == null) return null;
    const total = this.rowTotal(row);
    return total != null ? total * this.settings.creditValue : null;
  }

  get grandTotal(): number | null {
    const values = this.sites
      .map(s => this.totals[s.site_id])
      .filter((v): v is number => v != null);
    return values.length ? values.reduce((a, b) => a + b, 0) : null;
  }

  get grandValue(): number | null {
    if (this.settings.creditValue == null || this.grandTotal == null) return null;
    return this.grandTotal * this.settings.creditValue;
  }

  get totals(): { [siteId: string]: number | null } {
    const result: { [site_id: string]: number | null } = {};
    for (const site of this.sites) {
      const values = this.rows
        .map(r => r[site.site_id] as number | null)
        .filter((v): v is number => v != null);
      result[site.site_id] = values.length ? values.reduce((a, b) => a + b, 0) : null;
    }
    return result;
  }

  get uptimeTotals(): { [siteId: string]: number | null } {
    const result: { [siteId: string]: number | null } = {};
    for (const site of this.sites) {
      const values = Object.values(this.uptimeData)
        .map(d => d[site.site_id])
        .filter((v): v is number => v != null);
      result[site.site_id] = values.length ? values.reduce((a, b) => a + b, 0) : null;
    }
    return result;
  }

  get grandUptimeTotal(): number | null {
    const values = this.sites
      .map(s => this.uptimeTotals[s.site_id])
      .filter((v): v is number => v != null);
    return values.length ? values.reduce((a, b) => a + b, 0) : null;
  }

  get uptimePercentages(): { [siteId: string]: number | null } {
    const totalPossibleSeconds = this.rows.length * 86400;
    if (!totalPossibleSeconds) return {};
    const result: { [siteId: string]: number | null } = {};
    for (const site of this.sites) {
      const uptime = this.uptimeTotals[site.site_id];
      result[site.site_id] = uptime != null ? (uptime / totalPossibleSeconds) * 100 : null;
    }
    return result;
  }

  get grandUptimePercentage(): number | null {
    const totalPossibleSeconds = this.rows.length * 86400 * this.sites.length;
    if (!totalPossibleSeconds) return null;
    const grand = this.grandUptimeTotal;
    return grand != null ? (grand / totalPossibleSeconds) * 100 : null;
  }

  formatUptime(seconds: number | null): string {
    if (seconds == null) return '—';
    return `${Math.round(seconds / 60).toLocaleString()} min`;
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
