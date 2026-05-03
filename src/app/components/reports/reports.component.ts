import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
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

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private userService: UserService
  ) {
    const now = new Date();
    this.endDate = new Date(now);
    this.startDate = new Date(now);
    this.startDate.setDate(this.startDate.getDate() - 30);
  }

  ngOnInit(): void {}

  runReport(): void {
    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId) return;

    const start = this.formatDate(this.startDate);
    const end = this.formatDate(this.endDate);

    this.loading = true;
    this.hasRun = true;

    this.http.get<ReportResponse>(
      `${environment.API_SERVER}/reports/daily-destruction/${tenantId}`,
      { params: { start, end } }
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