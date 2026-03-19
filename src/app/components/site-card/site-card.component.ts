import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Site, SiteDataReading } from '../../services/site.service';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-site-card',
    imports: [CardModule, BadgeModule, CommonModule],
    templateUrl: './site-card.component.html',
    styleUrl: './site-card.component.scss'
})
export class SiteCardComponent {
  @Input() siteData!: Site;
  @Input() layout: 'grid' | 'list' = 'grid';
  @Input() reading?: SiteDataReading;

  constructor(private router: Router) {}

  get mmBtuHr(): number | null {
    if (!this.reading) return null;
    return (this.reading.flr_flow * 60 * 1011 * this.reading.ch4) / 100000000;
  }

  navigateToSite(): void {
    this.router.navigate(['/site', this.siteData.site_id], {
      state: { siteData: this.siteData }
    });
  }
}
