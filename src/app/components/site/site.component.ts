import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { Site } from '../../services/site.service';

@Component({
  selector: 'app-site',
  imports: [CommonModule, CardModule, ButtonModule, BadgeModule],
  templateUrl: './site.component.html',
  styleUrl: './site.component.scss',
})
export class SiteComponent implements OnInit {
  siteId: number | null = null;
  siteData: Site | null = null;
  loading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Access router state via history
    const state = history.state as { siteData?: Site };

    if (state?.siteData) {
      // Use the data passed from site-card
      this.siteData = state.siteData;
      this.siteId = state.siteData.site_id;
      this.loading = false;
    } else {
      // Fallback: get site ID from route params
      this.route.params.subscribe(params => {
        this.siteId = +params['id'];
        this.loadSiteData();
      });
    }
  }

  loadSiteData(): void {
    if (!this.siteId) return;

    // Fallback to mock data if no state was passed
    this.siteData = {
      site_id: this.siteId,
      name: `Site ${this.siteId}`,
      connection_status: 'offline'
    };
    this.loading = false;
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
