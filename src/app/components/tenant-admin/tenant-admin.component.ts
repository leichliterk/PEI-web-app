import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { environment } from '../../../environments/environment';

export interface AdminSite {
  site_id: string;
  name: string;
  status: 'offline' | 'testing' | 'production';
  archived: boolean;
  carb_certified: boolean;
  connection_status?: boolean;
}

@Component({
  selector: 'app-tenant-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToggleSwitchModule,
    ConfirmPopupModule,
    ToastModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tenant-admin.component.html',
  styleUrl: './tenant-admin.component.scss',
})
export class TenantAdminComponent implements OnInit {
  sites: AdminSite[] = [];
  archivedSites: AdminSite[] = [];
  loading = true;
  showArchived = false;

  // ── Create ────────────────────────────────────────────────────────────────
  createDialogVisible = false;
  createForm = { name: '', site_id: '' };
  createSaving = false;

  // ── Edit ──────────────────────────────────────────────────────────────────
  editDialogVisible = false;
  editingSite: AdminSite | null = null;
  editForm = { name: '', status: 'offline' as AdminSite['status'] };
  editSaving = false;

  // ── Delete ────────────────────────────────────────────────────────────────
  deleteDialogVisible = false;
  siteToDelete: AdminSite | null = null;
  deleteInProgress = false;

  readonly statusOptions = [
    { label: 'Offline',    value: 'offline' },
    { label: 'Testing',    value: 'testing' },
    { label: 'Production', value: 'production' },
  ];

  private get tenantId(): number | undefined {
    return this.userService.appUserValue?.tenant_id;
  }

  private get base(): string {
    return `${environment.API_SERVER}/site-admin/${this.tenantId}/sites`;
  }

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.loadSites();
  }

  loadSites(): void {
    if (!this.tenantId) return;
    this.loading = true;
    this.http.get<AdminSite[]>(`${this.base}?includeArchived=true`).subscribe({
      next: sites => {
        this.sites = sites.filter(s => !s.archived);
        this.archivedSites = sites.filter(s => s.archived);
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load sites' });
        this.loading = false;
      },
    });
  }

  statusSeverity(status: string): 'secondary' | 'warn' | 'success' {
    if (status === 'production') return 'success';
    if (status === 'testing') return 'warn';
    return 'secondary';
  }

  // ── Create ────────────────────────────────────────────────────────────────

  openCreateDialog(): void {
    this.createForm = { name: '', site_id: '' };
    this.createDialogVisible = true;
  }

  createSite(): void {
    if (!this.createForm.name.trim() || !this.createForm.site_id.trim()) return;
    this.createSaving = true;
    this.http.post<AdminSite>(this.base, { name: this.createForm.name.trim(), site_id: this.createForm.site_id.trim() }).subscribe({
      next: site => {
        this.sites = [...this.sites, site];
        this.createDialogVisible = false;
        this.createSaving = false;
        this.messageService.add({ severity: 'success', summary: 'Created', detail: `Site "${site.name}" created` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create site' });
        this.createSaving = false;
      },
    });
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  openEditDialog(site: AdminSite): void {
    this.editingSite = site;
    this.editForm = { name: site.name, status: site.status };
    this.editDialogVisible = true;
  }

  saveEdit(): void {
    if (!this.editingSite || !this.editForm.name.trim()) return;
    this.editSaving = true;

    const nameChanged = this.editForm.name.trim() !== this.editingSite.name;
    const statusChanged = this.editForm.status !== this.editingSite.status;

    const calls: Promise<void>[] = [];

    if (nameChanged) {
      calls.push(
        this.http.patch<AdminSite>(`${this.base}/${this.editingSite.site_id}`, { name: this.editForm.name.trim() })
          .toPromise().then(updated => { if (updated) Object.assign(this.editingSite!, { name: updated.name }); })
      );
    }
    if (statusChanged) {
      calls.push(
        this.http.patch<AdminSite>(`${this.base}/${this.editingSite.site_id}/status`, { status: this.editForm.status })
          .toPromise().then(updated => { if (updated) Object.assign(this.editingSite!, { status: updated.status }); })
      );
    }

    Promise.all(calls).then(() => {
      this.sites = [...this.sites];
      this.editDialogVisible = false;
      this.editSaving = false;
      this.messageService.add({ severity: 'success', summary: 'Saved', detail: `Site "${this.editingSite!.name}" updated` });
    }).catch(() => {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update site' });
      this.editSaving = false;
    });
  }

  // ── CARB toggle ───────────────────────────────────────────────────────────

  onCarbToggle(site: AdminSite): void {
    this.http.patch<AdminSite>(`${this.base}/${site.site_id}/carb`, { carb_certified: site.carb_certified }).subscribe({
      error: () => {
        site.carb_certified = !site.carb_certified; // revert
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update CARB certification' });
      },
    });
  }

  // ── Archive ───────────────────────────────────────────────────────────────

  confirmArchive(event: Event, site: AdminSite): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `Archive "${site.name}"?`,
      acceptLabel: 'Archive',
      rejectLabel: 'Cancel',
      accept: () => this.archiveSite(site),
    });
  }

  private archiveSite(site: AdminSite): void {
    this.http.patch(`${this.base}/${site.site_id}/archive`, {}).subscribe({
      next: () => {
        this.sites = this.sites.filter(s => s.site_id !== site.site_id);
        this.archivedSites = [...this.archivedSites, { ...site, archived: true }];
        this.messageService.add({ severity: 'info', summary: 'Archived', detail: `"${site.name}" archived` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to archive site' });
      },
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  openDeleteDialog(site: AdminSite): void {
    this.siteToDelete = site;
    this.deleteDialogVisible = true;
  }

  confirmDelete(): void {
    if (!this.siteToDelete) return;
    this.deleteInProgress = true;
    this.http.delete(`${this.base}/${this.siteToDelete.site_id}`).subscribe({
      next: () => {
        this.sites = this.sites.filter(s => s.site_id !== this.siteToDelete!.site_id);
        this.deleteDialogVisible = false;
        this.deleteInProgress = false;
        this.messageService.add({ severity: 'info', summary: 'Deleted', detail: `"${this.siteToDelete!.name}" deleted` });
        this.siteToDelete = null;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete site' });
        this.deleteInProgress = false;
      },
    });
  }
}
