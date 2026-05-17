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

  // ── Inline draft ─────────────────────────────────────────────────────────
  draftVisible = false;
  sites: TenantSite[] = [];
  draftSite: TenantSite | null = null;
  draftTags: NotificationTag[] = [];
  draftTagsLoading = false;
  draftTagsError = false;
  draftTag: NotificationTag | null = null;
  draftOperator: RuleOperator = 'gt';
  draftThreshold: number | null = null;
  submitting = false;

  readonly operatorOptions = [
    { label: '>',  value: 'gt'  },
    { label: '≥',  value: 'gte' },
    { label: '<',  value: 'lt'  },
    { label: '≤',  value: 'lte' },
    { label: '=',  value: 'eq'  },
    { label: '≠',  value: 'neq' },
  ];

  readonly operatorSymbols: Record<string, string> = {
    gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=', neq: '≠'
  };

  get draftPreview(): string {
    if (!this.draftTag) return '—';
    const sym = this.operatorSymbols[this.draftOperator];
    const unit = this.draftTag.unit ? ` ${this.draftTag.unit}` : '';
    const val = this.draftThreshold != null ? this.draftThreshold : '…';
    return `${this.draftTag.displayName} ${sym} ${val}${unit}`;
  }

  get draftValid(): boolean {
    return !!this.draftSite && !!this.draftTag && this.draftThreshold != null;
  }

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
        rule.enabled = previous;
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

  // ── Inline draft ─────────────────────────────────────────────────────────

  openDraft(): void {
    this.draftSite = null;
    this.draftTag = null;
    this.draftTags = [];
    this.draftTagsError = false;
    this.draftOperator = 'gt';
    this.draftThreshold = null;
    this.draftVisible = true;
  }

  cancelDraft(): void {
    this.draftVisible = false;
  }

  onDraftSiteSelected(): void {
    this.draftTag = null;
    this.draftTags = [];
    this.draftTagsError = false;
    if (!this.draftSite) return;

    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId) return;

    this.draftTagsLoading = true;
    this.rulesService.getTags(tenantId, this.draftSite.site_id).subscribe({
      next: tags => {
        this.draftTags = tags.filter(t => t.displayName);
        this.draftTagsLoading = false;
        if (!this.draftTags.length) this.draftTagsError = true;
      },
      error: () => {
        this.draftTagsError = true;
        this.draftTagsLoading = false;
      },
    });
  }

  submitDraft(): void {
    const tenantId = this.userService.appUserValue?.tenant_id;
    if (!tenantId || !this.draftSite || !this.draftTag || this.draftThreshold == null) return;

    this.submitting = true;
    this.rulesService.createRule({
      tenant_id: tenantId,
      site_id: this.draftSite.site_id,
      site_name: this.draftSite.name,
      tag_name: this.draftTag.name,
      tag_display_name: this.draftTag.displayName,
      tag_unit: this.draftTag.unit ?? '',
      operator: this.draftOperator,
      threshold: this.draftThreshold,
    }).subscribe({
      next: rule => {
        this.rules = [...this.rules, rule];
        this.draftVisible = false;
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
