import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Site {
  id: number;
  name: string;
  location: string;
  description: string;
  uptime: number;
}

@Injectable({
  providedIn: 'root'
})
export class SiteService {

  constructor(private http: HttpClient) { }

  getAllSites(): Observable<Site[]> {
    return this.http.get<Site[]>(`${environment.API_SERVER}/site/getAllsites`);
  }
}
