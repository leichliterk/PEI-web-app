import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Site {
  site_id: number;
  name: string;
  connection_status: 'online' | 'warning' | 'offline';
}

export interface UptimeSession {
  connected_at: string;
  disconnected_at: string | null;
  duration_ms: number | null;
  disconnect_reason: string | null;
}

export interface SiteUptime {
  tenant_id: number;
  site_id: number;
  days: number;
  start_date: string;
  end_date: string;
  total_time_ms: number;
  total_uptime_ms: number;
  uptime_percentage: number;
  sessions: UptimeSession[];
}

@Injectable({
  providedIn: 'root'
})
export class SiteService {

  constructor(private http: HttpClient) { }

  getAllSites(): Observable<Site[]> {
    return this.http.get<Site[]>(`${environment.API_SERVER}/site/getAllsites`);
  }

  getSiteById(site_id: number): Observable<Site> {
    return this.http.get<Site>(`${environment.API_SERVER}/site/getSiteById/${site_id}`);
  }

  getSiteUptime(tenant_id: number, site_id: number, days: number = 7): Observable<SiteUptime> {
    return this.http.get<SiteUptime>(`${environment.API_SERVER}/site/uptime/${tenant_id}/${site_id}?days=${days}`);
  }
}
