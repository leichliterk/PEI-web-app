import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { WebSocketService, PlcSnapshot, DiscoveredTag } from './websocket.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlcService implements OnDestroy {
  private snapshotSubject = new BehaviorSubject<PlcSnapshot | null>(null);
  private tagsSubject = new BehaviorSubject<DiscoveredTag[]>([]);
  private currentRoom: string | null = null;
  private snapshotSub?: Subscription;
  private tagsSub?: Subscription;

  latestSnapshot$: Observable<PlcSnapshot | null> = this.snapshotSubject.asObservable();
  tags$: Observable<DiscoveredTag[]> = this.tagsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private wsService: WebSocketService
  ) {
    this.snapshotSub = this.wsService.plcSnapshot$.subscribe(s => this.snapshotSubject.next(s));
    this.tagsSub = this.wsService.plcTags$.subscribe(t => this.tagsSubject.next(t));
  }

  subscribeSite(tenantId: number, siteId: number): void {
    if (this.currentRoom) {
      this.wsService.leaveRoom(this.currentRoom);
    }
    this.currentRoom = `site:${tenantId}:${siteId}`;
    this.wsService.joinRoom(this.currentRoom);

    this.snapshotSubject.next(null);
    this.tagsSubject.next([]);

    this.http.get<PlcSnapshot>(`${environment.API_SERVER}/plc/${tenantId}/${siteId}/latest`).subscribe({
      next: snap => { if (snap) this.snapshotSubject.next(snap); }
    });

    this.http.get<DiscoveredTag[]>(`${environment.API_SERVER}/plc/${tenantId}/${siteId}/tags`).subscribe({
      next: tags => { if (tags?.length) this.tagsSubject.next(tags); }
    });
  }

  unsubscribeSite(): void {
    if (this.currentRoom) {
      this.wsService.leaveRoom(this.currentRoom);
      this.currentRoom = null;
    }
    this.snapshotSubject.next(null);
    this.tagsSubject.next([]);
  }

  ngOnDestroy(): void {
    this.unsubscribeSite();
    this.snapshotSub?.unsubscribe();
    this.tagsSub?.unsubscribe();
  }
}