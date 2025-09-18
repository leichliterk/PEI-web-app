import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Tenant {
  tenant_id: number;
  name: string;
  sites: Array<{
    site_id: number,
    name: string,
    uptime: number
  }>;
  meta: {}
}

@Injectable({
  providedIn: 'root'
})

export class TenantService {

  constructor(private http: HttpClient) { }

  getTenantById(tenant_id: number): Observable<Tenant> {
    return this.http.get<Tenant>(`${environment.API_SERVER}/tenant/getTenantById/${tenant_id}`);
  }
}