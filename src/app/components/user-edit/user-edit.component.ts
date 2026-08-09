import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AppUser, UserService } from '../../services/user.service';
import { TenantService, TenantSite } from '../../services/tenant.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    MultiSelectModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './user-edit.component.html',
  styleUrl: './user-edit.component.scss',
})
export class UserEditComponent implements OnInit {
  sites: TenantSite[] = [];
  saving = false;
  user!: AppUser;
  private returnUrl = '/home';

  form = {
    fname:    '',
    lname:    '',
    email:    '',
    role:     '',
    site_ids: [] as string[],
    status:   '',
  };

  private static readonly ROLE_OPTIONS = [
    { label: 'User',                 value: 'user' },
    { label: 'Administrator',        value: 'administrator' },
    { label: 'Global Administrator', value: 'global_admin' },
  ];

  readonly roleOptions = UserEditComponent.ROLE_OPTIONS;

  readonly statusOptions = [
    { label: 'Active',   value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Pending',  value: 'pending' },
  ];

  get canEditRole(): boolean {
    return this.userService.appUserValue?.role === 'global_admin';
  }

  roleLabel(role: string): string {
    if (role === 'global_admin') return 'Global Administrator';
    if (role === 'administrator') return 'Administrator';
    return 'User';
  }

  private get tenantId(): number | undefined {
    return this.userService.appUserValue?.tenant_id;
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private userService: UserService,
    private tenantService: TenantService,
    private messageService: MessageService,
  ) {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state ?? history.state;
    this.user = state?.['user'];
    this.returnUrl = state?.['returnUrl'] ?? '/home';
  }

  ngOnInit(): void {
    if (!this.user) {
      this.router.navigate(['/my-account']);
      return;
    }

    this.form = {
      fname:    this.user.fname,
      lname:    this.user.lname,
      email:    this.user.email,
      role:     this.user.role,
      site_ids: [...(this.user.site_ids ?? [])],
      status:   this.user.status,
    };

    const tid = this.tenantId;
    if (tid) {
      this.tenantService.getTenantById(tid).subscribe({
        next: tenant => { this.sites = tenant.sites ?? []; },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load site list' });
        },
      });
    }
  }

  get formValid(): boolean {
    return !!(this.form.fname.trim() && this.form.lname.trim() && this.form.role);
  }

  save(): void {
    if (!this.formValid) return;
    this.saving = true;
    const payload = {
      email:    this.form.email,
      fname:    this.form.fname.trim(),
      lname:    this.form.lname.trim(),
      role:     this.form.role,
      site_ids: this.form.site_ids,
      status:   this.form.status,
    };
    this.http.put(`${environment.API_SERVER}/user/updateUser`, payload).subscribe({
      next: () => {
        if (this.form.email === this.userService.appUserValue?.email) {
          this.userService.patchAppUser({
            fname:    payload.fname,
            lname:    payload.lname,
            role:     payload.role as AppUser['role'],
            site_ids: payload.site_ids,
            status:   payload.status,
          });
        }
        this.router.navigate([this.returnUrl]);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update user' });
        this.saving = false;
      },
    });
  }

  cancel(): void {
    this.router.navigate([this.returnUrl]);
  }
}
