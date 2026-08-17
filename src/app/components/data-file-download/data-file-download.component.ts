import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter, take } from 'rxjs';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { TenantService, TenantSite } from '../../services/tenant.service';
import { environment } from '../../../environments/environment';

export interface SiteSelection extends TenantSite {
  selected: boolean;
}

@Component({
  selector: 'app-data-file-download',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePickerModule,
    ButtonModule,
    CheckboxModule,
    ProgressSpinnerModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './data-file-download.component.html',
  styleUrl: './data-file-download.component.scss',
})
export class DataFileDownloadComponent implements OnInit {
  date: Date = new Date();
  readonly today = new Date();
  includeAccountingLog = false;
  includeFlareData = false;
  includeChartRecorder = false;
  sites: SiteSelection[] = [];
  downloading = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private userService: UserService,
    private tenantService: TenantService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.userService.appUser$.pipe(
      filter(user => !!user),
      take(1)
    ).subscribe(appUser => {
      const allowed = new Set(appUser!.site_ids);
      this.tenantService.getTenantById(appUser!.tenant_id).subscribe({
        next: tenant => {
          this.sites = tenant.sites
            .filter(s => allowed.has(s.site_id))
            .map(s => ({ ...s, selected: true }));
        },
      });
    });
  }

  get selectedCount(): number {
    return this.sites.filter(s => s.selected).length;
  }

  get canDownload(): boolean {
    return !!this.date &&
      this.selectedCount > 0 &&
      (this.includeAccountingLog || this.includeFlareData || this.includeChartRecorder);
  }

  download(): void {
    if (!this.canDownload) return;

    const siteList = this.sites
      .filter(s => s.selected)
      .map(s => s.site_id)
      .join(',');

    const categories: string[] = [];
    if (this.includeAccountingLog) categories.push('accounting_log');
    if (this.includeFlareData)     categories.push('flare_data');
    if (this.includeChartRecorder) categories.push('chart_recorder');

    const dateStr = this.date.toISOString().split('T')[0];

    const url = `${environment.API_SERVER}/files/download-zip` +
      `?sites=${encodeURIComponent(siteList)}` +
      `&categories=${encodeURIComponent(categories.join(','))}` +
      `&date=${dateStr}`;

    this.downloading = true;

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: blob => {
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = `data-files-${dateStr}.zip`;
        anchor.click();
        URL.revokeObjectURL(objectUrl);
        this.downloading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Download Failed',
          detail: 'Could not retrieve files from the server.',
        });
        this.downloading = false;
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/home']);
  }
}
