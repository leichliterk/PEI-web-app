import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type RuleOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';

export interface NotificationRule {
  id: string;
  tenant_id: number;
  site_id: number;
  site_name: string;
  tag_name: string;
  tag_display_name: string;
  tag_unit: string;
  operator: RuleOperator;
  threshold: number;
  label: string;
  enabled: boolean;
  created_at: string;
}

export interface CreateRulePayload {
  tenant_id: number;
  site_id: number;
  site_name: string;
  tag_name: string;
  tag_display_name: string;
  tag_unit: string;
  operator: RuleOperator;
  threshold: number;
}

export interface NotificationTag {
  name: string;
  displayName: string;
  unit: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationRulesService {
  private readonly base = `${environment.API_SERVER}/notifications/rules`;
  private readonly plcBase = `${environment.API_SERVER}/plc`;

  constructor(private http: HttpClient) {}

  getRules(): Observable<NotificationRule[]> {
    return this.http.get<NotificationRule[]>(this.base);
  }

  createRule(payload: CreateRulePayload): Observable<NotificationRule> {
    return this.http.post<NotificationRule>(this.base, payload);
  }

  setEnabled(id: string, enabled: boolean): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.base}/${id}`, { enabled });
  }

  updateRule(id: string, changes: { operator: RuleOperator; threshold: number }): Observable<NotificationRule> {
    return this.http.put<NotificationRule>(`${this.base}/${id}`, changes);
  }

  deleteRule(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }

  getTags(tenantId: number, siteId: number): Observable<NotificationTag[]> {
    return this.http.get<any>(`${this.plcBase}/${tenantId}/${siteId}/latest`).pipe(
      map((res: any) => {
        const tags: any[] = Array.isArray(res?.tags) ? res.tags : [];
        return tags
          .filter((t: any) => t.displayName)
          .map((t: any): NotificationTag => ({ name: t.name, displayName: t.displayName, unit: t.unit ?? null }));
      })
    );
  }
}
