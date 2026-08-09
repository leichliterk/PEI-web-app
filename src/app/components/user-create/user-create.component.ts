import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { TenantService, TenantSite } from '../../services/tenant.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    MultiSelectModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './user-create.component.html',
  styleUrl: './user-create.component.scss',
})
export class UserCreateComponent implements OnInit {
  sites: TenantSite[] = [];
  saving = false;

  form = {
    fname: '',
    lname: '',
    email: '',
    password: '',
    role: '',
    site_ids: [] as string[],
  };

  readonly roleOptions = [
    { label: 'User',          value: 'user' },
    { label: 'Administrator', value: 'administrator' },
    { label: 'Admin',         value: 'admin' },
  ];

  private get tenantId(): number | undefined {
    return this.userService.appUserValue?.tenant_id;
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private userService: UserService,
    private tenantService: TenantService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
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
    return !!(
      this.form.fname.trim() &&
      this.form.lname.trim() &&
      this.form.email.trim() &&
      this.form.password.trim() &&
      this.form.role
    );
  }

  save(): void {
    if (!this.formValid) return;
    this.saving = true;
    const payload = {
      fname:     this.form.fname.trim(),
      lname:     this.form.lname.trim(),
      email:     this.form.email.trim(),
      password:  this.form.password,
      role:      this.form.role,
      site_ids:  this.form.site_ids,
      tenant_id: this.tenantId,
      group:     'user',
    };
    this.http.post(`${environment.API_SERVER}/user/registerUser`, payload).subscribe({
      next: () => {
        this.router.navigate(['/user-admin']);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create user' });
        this.saving = false;
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/user-admin']);
  }
}
