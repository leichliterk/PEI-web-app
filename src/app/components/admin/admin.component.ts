import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { environment } from '../../../environments/environment';

export interface OtaRelease {
  _id: string;
  version: string;
  name: string;
  description: string;
  status: 'draft' | 'published' | 'deprecated';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-admin',
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
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  releases: OtaRelease[] = [];
  loading = true;

  createDialogVisible = false;
  uploadDialogVisible = false;

  newRelease = { version: '', name: '', description: '' };
  newReleaseFile: File | null = null;
  selectedRelease: OtaRelease | null = null;
  selectedFile: File | null = null;
  uploading = false;
  saving = false;

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

  openCreateDialog(): void {
    this.newRelease = { version: '', name: '', description: '' };
    this.newReleaseFile = null;
    this.createDialogVisible = true;
  }

  onNewReleaseFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newReleaseFile = input.files?.[0] ?? null;
  }

  createRelease(): void {
    if (!this.newRelease.version || !this.newRelease.name) return;
    this.saving = true;

    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId) return;

    const formData = new FormData();
    formData.append('tenant_id', String(tenantId));
    formData.append('version', this.newRelease.version);
    formData.append('name', this.newRelease.name);
    formData.append('description', this.newRelease.description);
    if (this.newReleaseFile) {
      formData.append('exe', this.newReleaseFile);
    }

    this.http.post<OtaRelease>(`${environment.API_SERVER}/ota/upload`, formData).subscribe({
      next: release => {
        this.releases = [release, ...this.releases];
        this.createDialogVisible = false;
        this.saving = false;
        this.messageService.add({ severity: 'success', summary: 'Created', detail: `Release ${release.version} created` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create release' });
        this.saving = false;
      }
    });
  }

  openUploadDialog(release: OtaRelease): void {
    this.selectedRelease = release;
    this.selectedFile = null;
    this.uploadDialogVisible = true;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  uploadInstaller(): void {
    if (!this.selectedRelease || !this.selectedFile) return;
    this.uploading = true;

    const formData = new FormData();
    formData.append('exe', this.selectedFile);

    this.http.post<OtaRelease>(
      `${environment.API_SERVER}/ota/upload`,
      formData
    ).subscribe({
      next: updated => {
        this.releases = this.releases.map(r => r._id === updated._id ? updated : r);
        this.uploadDialogVisible = false;
        this.uploading = false;
        this.messageService.add({ severity: 'success', summary: 'Uploaded', detail: 'Installer file uploaded' });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Upload failed' });
        this.uploading = false;
      }
    });
  }

  publishRelease(release: OtaRelease): void {
    this.http.patch<OtaRelease>(`${environment.API_SERVER}/releases/${release._id}`, { status: 'published' }).subscribe({
      next: updated => {
        this.releases = this.releases.map(r => r._id === updated._id ? updated : r);
        this.messageService.add({ severity: 'success', summary: 'Published', detail: `v${updated.version} is now live` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to publish release' });
      }
    });
  }

  deprecateRelease(release: OtaRelease): void {
    this.http.patch<OtaRelease>(`${environment.API_SERVER}/releases/${release._id}`, { status: 'deprecated' }).subscribe({
      next: updated => {
        this.releases = this.releases.map(r => r._id === updated._id ? updated : r);
        this.messageService.add({ severity: 'warn', summary: 'Deprecated', detail: `v${updated.version} deprecated` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to deprecate release' });
      }
    });
  }

  formatBytes(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  statusSeverity(status: string): 'success' | 'warn' | 'secondary' | 'danger' {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'secondary';
      case 'deprecated': return 'warn';
      default: return 'secondary';
    }
  }
}