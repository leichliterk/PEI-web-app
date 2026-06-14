import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { environment } from '../../../environments/environment';

export interface OtaRelease {
  _id: string;
  tenant_id: number;
  version: string;
  filename: string;
  size: number;
  sha256: string;
  notes: string;
  gridfs_file_id: string;
  created_by: string;
  status: 'active' | 'superseded' | 'archived';
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-site-release-mgmt',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    TagModule,
    SelectModule,
    ToastModule,
    ProgressBarModule,
  ],
  providers: [MessageService],
  templateUrl: './site-release-mgmt.component.html',
  styleUrl: './site-release-mgmt.component.scss'
})
export class SiteReleaseMgmtComponent implements OnInit {
  releases: OtaRelease[] = [];
  loading = true;

  // Create dialog
  createDialogVisible = false;
  newRelease = { version: '', notes: '' };
  newReleaseFile: File | null = null;
  saving = false;
  uploadProgress: number | null = null;  // null = hidden, 0-100 = uploading bytes
  uploadProcessing = false;              // true = bytes sent, server still processing

  // Edit dialog
  editDialogVisible = false;
  editingRelease: OtaRelease | null = null;
  editForm = { version: '', notes: '', status: '' };
  editSaving = false;

  // Delete dialog
  deleteDialogVisible = false;
  releaseToDelete: OtaRelease | null = null;
  deleteInProgress = false;

  readonly statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Superseded', value: 'superseded' },
    { label: 'Archived', value: 'archived' },
  ];

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadReleases();
  }

  loadReleases(): void {
    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId) {
      this.loading = false;
      return;
    }
    this.loading = true;
    this.http.get<OtaRelease[]>(`${environment.API_SERVER}/ota/releases/${tenantId}`).subscribe({
      next: releases => {
        this.releases = releases;
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load releases' });
        this.loading = false;
      }
    });
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  openCreateDialog(): void {
    this.newRelease = { version: '', notes: '' };
    this.newReleaseFile = null;
    this.createDialogVisible = true;
  }

  onNewReleaseFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newReleaseFile = input.files?.[0] ?? null;
  }

  createRelease(): void {
    if (!this.newRelease.version) return;

    const user = this.userService.appUserValue;
    if (!user) return;

    const formData = new FormData();
    formData.append('tenant_id', String(user.tenant_id));
    formData.append('version', this.newRelease.version);
    formData.append('notes', this.newRelease.notes);
    formData.append('created_by', user.auth0_id);
    if (this.newReleaseFile) {
      formData.append('exe', this.newReleaseFile);
    }

    this.saving = true;
    this.uploadProgress = 0;

    const req = new HttpRequest('POST', `${environment.API_SERVER}/ota/upload`, formData, {
      reportProgress: true
    });

    this.http.request<OtaRelease>(req).subscribe({
      next: event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const pct = Math.round(100 * event.loaded / event.total);
          if (pct >= 100) {
            // All bytes sent — server is now processing; switch to indeterminate
            this.uploadProgress = null;
            this.uploadProcessing = true;
          } else {
            this.uploadProgress = pct;
          }
        } else if (event.type === HttpEventType.Response) {
          const release = event.body!;
          this.releases = [release, ...this.releases];
          this.createDialogVisible = false;
          this.saving = false;
          this.uploadProgress = null;
          this.uploadProcessing = false;
          this.messageService.add({ severity: 'success', summary: 'Created', detail: `Release ${release.version} created` });
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create release' });
        this.saving = false;
        this.uploadProgress = null;
        this.uploadProcessing = false;
      }
    });
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  openEditDialog(release: OtaRelease): void {
    this.editingRelease = release;
    this.editForm = { version: release.version, notes: release.notes ?? '', status: release.status };
    this.editDialogVisible = true;
  }

  saveEdit(): void {
    if (!this.editingRelease || !this.editForm.version) return;
    this.editSaving = true;

    this.http.patch<OtaRelease>(
      `${environment.API_SERVER}/ota/releases/${this.editingRelease._id}`,
      { version: this.editForm.version, notes: this.editForm.notes, status: this.editForm.status }
    ).subscribe({
      next: updated => {
        this.releases = this.releases.map(r => r._id === updated._id ? updated : r);
        this.editDialogVisible = false;
        this.editSaving = false;
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: `v${updated.version} updated` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update release' });
        this.editSaving = false;
      }
    });
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  openDeleteDialog(release: OtaRelease): void {
    this.releaseToDelete = release;
    this.deleteDialogVisible = true;
  }

  confirmDelete(): void {
    if (!this.releaseToDelete) return;
    this.deleteInProgress = true;

    this.http.delete(`${environment.API_SERVER}/ota/releases/${this.releaseToDelete._id}`).subscribe({
      next: () => {
        this.releases = this.releases.filter(r => r._id !== this.releaseToDelete!._id);
        this.deleteDialogVisible = false;
        this.deleteInProgress = false;
        this.messageService.add({ severity: 'info', summary: 'Deleted', detail: `v${this.releaseToDelete!.version} deleted` });
        this.releaseToDelete = null;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete release' });
        this.deleteInProgress = false;
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  formatBytes(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  statusSeverity(status: string): 'success' | 'warn' | 'secondary' | 'danger' {
    switch (status) {
      case 'active': return 'success';
      case 'superseded': return 'secondary';
      case 'archived': return 'warn';
      default: return 'secondary';
    }
  }
}
