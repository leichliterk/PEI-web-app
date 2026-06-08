import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { TenantService, TenantSite } from '../../services/tenant.service';
import { PlcService } from '../../services/plc.service';
import { PlcSnapshot, DiscoveredTag, TagReading } from '../../services/websocket.service';

interface ScopeOption { label: string; value: string | null; }

@Component({
  selector: 'app-scada',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    TabsModule,
    SelectModule,
    InputTextModule,
    TooltipModule,
    ProgressSpinnerModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './scada.component.html',
  styleUrl: './scada.component.scss'
})
export class ScadaComponent implements OnInit, OnDestroy {
  sites: TenantSite[] = [];
  selectedSiteId: string | null = null;

  snapshot: PlcSnapshot | null = null;
  tags: DiscoveredTag[] = [];

  // Tag browser filters
  tagNameFilter = '';
  selectedScope: string | null = null;
  scopeOptions: ScopeOption[] = [
    { label: 'All Scopes', value: null },
    { label: 'Controller', value: 'Controller' },
    { label: 'Program', value: 'Program' },
  ];

  private snapshotSub?: Subscription;
  private tagsSub?: Subscription;

  constructor(
    private userService: UserService,
    private tenantService: TenantService,
    private plcService: PlcService
  ) {}

  ngOnInit(): void {
    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId) return;

    this.tenantService.getTenantById(tenantId).subscribe({
      next: tenant => { this.sites = tenant.sites; }
    });

    this.snapshotSub = this.plcService.latestSnapshot$.subscribe(s => this.snapshot = s);
    this.tagsSub = this.plcService.tags$.subscribe(t => this.tags = t);
  }

  onSiteSelected(): void {
    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId || !this.selectedSiteId) return;
    this.plcService.subscribeSite(tenantId, this.selectedSiteId);
  }

  get filteredTags(): DiscoveredTag[] {
    return this.tags.filter(t => {
      const nameMatch = !this.tagNameFilter || t.name.toLowerCase().includes(this.tagNameFilter.toLowerCase());
      const scopeMatch = !this.selectedScope || t.scope === this.selectedScope;
      return nameMatch && scopeMatch;
    });
  }

  formatValue(tag: TagReading): string {
    if (tag.error) return 'ERR';
    if (tag.value === null || tag.value === undefined) return '—';
    if (typeof tag.value === 'boolean') return tag.value ? 'ON' : 'OFF';
    if (typeof tag.value === 'number') return tag.value.toFixed(3);
    return String(tag.value);
  }

  ngOnDestroy(): void {
    this.plcService.unsubscribeSite();
    this.snapshotSub?.unsubscribe();
    this.tagsSub?.unsubscribe();
  }
}