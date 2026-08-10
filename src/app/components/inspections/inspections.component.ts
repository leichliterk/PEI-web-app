import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './inspections.component.html',
  styleUrl: './inspections.component.scss',
})
export class InspectionsComponent {
  constructor(private router: Router) {}

  goWeekly(): void {
    this.router.navigate(['/inspection/weekly']);
  }

  goMonthly(): void {
    this.router.navigate(['/inspection/monthly']);
  }
}
