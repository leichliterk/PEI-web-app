import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-delete-account',
  standalone: true,
  imports: [FormsModule, InputTextModule, ButtonModule, DialogModule],
  templateUrl: './delete-account.component.html',
  styleUrl: './delete-account.component.scss'
})
export class DeleteAccountComponent {
  email = '';
  confirmPhrase = '';
  dialogVisible = false;
  submitting = false;
  submitted = false;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  openConfirmDialog(): void {
    this.confirmPhrase = '';
    this.error = null;
    this.dialogVisible = true;
  }

  get phraseValid(): boolean {
    return this.confirmPhrase.trim().toLowerCase() === 'delete my account';
  }

  submit(): void {
    if (!this.phraseValid) return;
    this.submitting = true;
    this.error = null;

    this.http.post(`${environment.API_SERVER}/user/deleteAuth0Account`, { email: this.email }).subscribe({
      next: () => {
        this.submitting = false;
        this.dialogVisible = false;
        this.submitted = true;
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.message ?? 'Something went wrong. Please try again.';
      }
    });
  }
}
