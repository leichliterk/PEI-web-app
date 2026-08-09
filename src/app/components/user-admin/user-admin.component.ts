import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { AppUser } from '../../services/user.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-user-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    TagModule,
    ToastModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: './user-admin.component.html',
  styleUrl: './user-admin.component.scss',
})
export class UserAdminComponent implements OnInit {
  users: AppUser[] = [];
  loading = true;

  private get base(): string {
    return `${environment.API_SERVER}/user`;
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private messageService: MessageService,
  ) {}

  addUser(): void {
    this.router.navigate(['/user-create']);
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.http.get<AppUser[]>(`${this.base}/users`).subscribe({
      next: users => {
        this.users = Array.isArray(users) ? users : (users as any)?.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load users' });
        this.loading = false;
      },
    });
  }

  roleLabel(role: string): string {
    if (role === 'global_admin') return 'Global Administrator';
    if (role === 'administrator') return 'Administrator';
    return 'User';
  }

  statusSeverity(status: string): 'secondary' | 'success' | 'warn' {
    if (status === 'active') return 'success';
    if (status === 'pending') return 'warn';
    return 'secondary';
  }
}
