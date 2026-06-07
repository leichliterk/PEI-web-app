import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { environment } from '../../../environments/environment';

interface ReportSite {
  site_id: number;
  name: string;
}

interface ReportResponse {
  sites: ReportSite[];
  dates: string[];
  data: { [date: string]: { [siteId: string]: number | null } };
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
}

const SETTINGS_KEY = 'pei_report_settings';

const DEFAULT_SETTINGS: ReportSettings = {
  creditValue: null,
  T: null,
  DE: null,
  CF: null,
  PEMDF: null,
};

@Component({
  selector: 'app-reports',
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
  ],
  providers: [MessageService],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  startDate: Date;
  endDate: Date;

  sites: ReportSite[] = [];
  rows: ReportRow[] = [];
  constants: { T: number; DE: number; CF: number; PEMDF: number } | null = null;

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
      T:     this.settings.T     ?? this.constants?.T     ?? null,
      DE:    this.settings.DE    ?? this.constants?.DE    ?? null,
      CF:    this.settings.CF    ?? this.constants?.CF    ?? null,
      PEMDF: this.settings.PEMDF ?? this.constants?.PEMDF ?? null,
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

    this.http.get<ReportResponse>(
      `${environment.API_SERVER}/reports/daily-destruction/${tenantId}`,
      { params }
    ).subscribe({
      next: res => {
        this.sites = res.sites;
        this.constants = res.constants;
        this.rows = res.dates.map(date => {
          const row: ReportRow = { date };
          for (const site of res.sites) {
            row[site.site_id] = res.data[date]?.[site.site_id] ?? null;
          }
          return row;
        });
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load report data' });
        this.loading = false;
      }
    });
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
    const result: { [siteId: string]: number | null } = {};
    for (const site of this.sites) {
      const values = this.rows
        .map(r => r[site.site_id] as number | null)
        .filter((v): v is number => v != null);
      result[site.site_id] = values.length ? values.reduce((a, b) => a + b, 0) : null;
    }
    return result;
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
