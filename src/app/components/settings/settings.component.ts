import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { UserService } from '../../services/user.service';
import { TenantService, TenantSite } from '../../services/tenant.service';
import {
  NotificationRulesService,
  NotificationRule,
  NotificationTag,
  RuleOperator,
} from '../../services/notification-rules.service';

interface SiteGroup {
  siteId: number;
  siteName: string;
  rules: NotificationRule[];
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ToggleSwitchModule,
    DialogModule,
    SelectModule,
    InputNumberModule,
    ToastModule,
    ProgressSpinnerModule,
    DividerModule,
  ],
  providers: [MessageService],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  // ── Rules list ───────────────────────────────────────────────────────────
  rules: NotificationRule[] = [];
  rulesLoading = true;
  rulesError = false;

  get groupedRules(): SiteGroup[] {
    const map = new Map<number, SiteGroup>();
    for (const rule of this.rules) {
      if (!map.has(rule.site_id)) {
        map.set(rule.site_id, { siteId: rule.site_id, siteName: rule.site_name, rules: [] });
      }
      map.get(rule.site_id)!.rules.push(rule);
    }
    return [...map.values()];
  }

  // ── Delete confirm ───────────────────────────────────────────────────────
  deleteDialogVisible = false;
  ruleToDelete: NotificationRule | null = null;
  deleteInProgress = false;

  // ── Create dialog ────────────────────────────────────────────────────────
  createDialogVisible = false;
  step = 1;

  // Step 1
  sites: TenantSite[] = [];
  selectedSite: TenantSite | null = null;

  // Step 2
  tags: NotificationTag[] = [];
  tagsLoading = false;
  tagsError = false;
  selectedTag: NotificationTag | null = null;

  // Step 3
  readonly operatorOptions = [
    { label: '> Greater than',         value: 'gt'  },
    { label: '≥ Greater than or equal', value: 'gte' },
    { label: '< Less than',            value: 'lt'  },
    { label: '≤ Less than or equal',   value: 'lte' },
    { label: '= Equal',                value: 'eq'  },
    { label: '≠ Not equal',            value: 'neq' },
  ];

  readonly operatorSymbols: Record<string, string> = {
    gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=', neq: '≠'
  };

  selectedOperator: RuleOperator = 'gt';
  threshold: number | null = null;
  submitting = false;

  get previewLabel(): string {
    if (!this.selectedTag) return '—';
    const sym = this.operatorSymbols[this.selectedOperator] ?? '?';
    const unit = this.selectedTag.unit ? ` ${this.selectedTag.unit}` : '';
    const val = this.threshold != null ? this.threshold : '…';
    return `${this.selectedTag.displayName} ${sym} ${val}${unit}`;
  }

  get step2Valid(): boolean { return !!this.selectedTag; }
  get step3Valid(): boolean { return this.threshold != null; }

  constructor(
    private userService: UserService,
    private tenantService: TenantService,
    private rulesService: NotificationRulesService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadRules();

    const tenantId = this.userService.appUserValue?.tenant_id;
    if (tenantId) {
      this.tenantService.getTenantById(tenantId).subscribe({
        next: t => { this.sites = t.sites; },
        error: err => console.error('Failed to load sites:', err),
      });
    }
  }

  // ── Rules list ───────────────────────────────────────────────────────────

  loadRules(): void {
    this.rulesLoading = true;
    this.rulesError = false;
    this.rulesService.getRules().subscribe({
      next: rules => {
        this.rules = rules;
        this.rulesLoading = false;
      },
      error: () => {
        this.rulesError = true;
        this.rulesLoading = false;
      },
    });
  }

  toggleRule(rule: NotificationRule): void {
    const previous = !rule.enabled;
    this.rulesService.setEnabled(rule.id, rule.enabled).subscribe({
      error: () => {
        rule.enabled = previous; // revert
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update rule' });
      },
    });
  }

  openDeleteDialog(rule: NotificationRule): void {
    this.ruleToDelete = rule;
    this.deleteDialogVisible = true;
  }

  confirmDelete(): void {
    if (!this.ruleToDelete) return;
    this.deleteInProgress = true;
    this.rulesService.deleteRule(this.ruleToDelete.id).subscribe({
      next: () => {
        this.rules = this.rules.filter(r => r.id !== this.ruleToDelete!.id);
        this.deleteDialogVisible = false;
        this.deleteInProgress = false;
        this.ruleToDelete = null;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete rule' });
        this.deleteInProgress = false;
      },
    });
  }

  // ── Create dialog ────────────────────────────────────────────────────────

  openCreateDialog(): void {
    this.step = 1;
    this.selectedSite = null;
    this.selectedTag = null;
    this.tags = [];
    this.tagsError = false;
    this.selectedOperator = 'gt';
    this.threshold = null;
    this.createDialogVisible = true;
  }

  onSiteSelected(): void {
    if (!this.selectedSite) return;
    this.step = 2;
    this.tags = [];
    this.tagsError = false;
    this.tagsLoading = true;
    this.selectedTag = null;

    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId) return;

    this.rulesService.getTags(tenantId, this.selectedSite.site_id).subscribe({
      next: tags => {
        this.tags = tags.filter(t => t.displayName);
        this.tagsLoading = false;
        if (!this.tags.length) this.tagsError = true;
      },
      error: () => {
        this.tagsError = true;
        this.tagsLoading = false;
      },
    });
  }

  goToStep3(): void { this.step = 3; }

  submitRule(): void {
    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId || !this.selectedSite || !this.selectedTag || this.threshold == null) return;

    this.submitting = true;
    this.rulesService.createRule({
      tenant_id: tenantId,
      site_id: this.selectedSite.site_id,
      site_name: this.selectedSite.name,
      tag_name: this.selectedTag.name,
      tag_display_name: this.selectedTag.displayName,
      tag_unit: this.selectedTag.unit ?? '',
      operator: this.selectedOperator,
      threshold: this.threshold,
    }).subscribe({
      next: rule => {
        this.rules = [...this.rules, rule];
        this.createDialogVisible = false;
        this.submitting = false;
        this.messageService.add({ severity: 'success', summary: 'Rule Created', detail: rule.label });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create rule' });
        this.submitting = false;
      },
    });
  }
}
