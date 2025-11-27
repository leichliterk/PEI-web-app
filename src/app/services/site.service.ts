import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Site {
  site_id: number;
  name: string;
  connection_status: 'online' | 'warning' | 'offline';
}

export interface ConnectionLog {
  site_id: number;
  timestamp: Date;
  status: string;
  details: string;
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

  getLastConnectionLogs(site_id: number, limit: number): Observable<ConnectionLog[]> {
    return this.http.get<ConnectionLog[]>(`${environment.API_SERVER}/site/getConnectionLogs/${site_id}?limit=${limit}`);
  }


}
