import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Site, SiteDataReading } from '../../services/site.service';
import { PlcSnapshot } from '../../services/websocket.service';
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
  @Input() plcSnapshot?: PlcSnapshot;

  constructor(private router: Router) {}

  get offline(): boolean {
    return this.siteData.connection_status !== 'online';
  }

  get flareStatus(): 'running' | 'alarm' | 'shutdown' {
    if (this.reading?.flare_status) return this.reading.flare_status;
    if (!this.reading || this.reading.flr_flow === 0) return 'shutdown';
    return 'running';
  }

  private tagValue(displayName: string): number | null {
    const tag = this.plcSnapshot?.tags.find(t => t.displayName === displayName);
    if (tag && !tag.error && typeof tag.value === 'number') return tag.value;
    return null;
  }

  get mmBtuHr(): number | null {
    return this.tagValue('MMBTU/hr')
      ?? (this.reading ? (this.reading.flr_flow * 60 * 1011 * this.reading.ch4) / 100000000 : null);
  }

  get ch4(): number | null { return this.tagValue('CH4') ?? this.reading?.ch4 ?? null; }
  get o2(): number | null { return this.tagValue('O2') ?? this.reading?.o2 ?? null; }
  get flrFlow(): number | null { return this.tagValue('Flare flow') ?? this.reading?.flr_flow ?? null; }
  get inletPressure(): number | null { return this.tagValue('Inlet pressure') ?? this.reading?.inlet_pressure ?? null; }
  get flrSdv(): number | null {
    return this.tagValue('Shutdown valve') ?? (this.reading?.flr_sdv != null ? this.reading.flr_sdv : null);
  }

  navigateToSite(): void {
    this.router.navigate(['/site', this.siteData.site_id], {
      state: { siteData: this.siteData }
    });
  }
}