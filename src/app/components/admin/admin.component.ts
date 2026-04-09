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

  newRelease = { version: '', notes: '' };
  newReleaseFile: File | null = null;
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
    this.saving = true;

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

  archiveRelease(release: OtaRelease): void {
    this.http.patch<OtaRelease>(`${environment.API_SERVER}/ota/releases/${release._id}`, { status: 'archived' }).subscribe({
      next: updated => {
        this.releases = this.releases.map(r => r._id === updated._id ? updated : r);
        this.messageService.add({ severity: 'warn', summary: 'Archived', detail: `v${updated.version} archived` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to archive release' });
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
      case 'active': return 'success';
      case 'superseded': return 'secondary';
      case 'archived': return 'warn';
      default: return 'secondary';
    }
  }
}