import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

export interface SiteStatusUpdate {
  site_id: number;
  connection_status: boolean;
  last_seen?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  private siteStatusSubject = new Subject<SiteStatusUpdate>();
  private tenantId: number | null = null;

  siteStatus$: Observable<SiteStatusUpdate> = this.siteStatusSubject.asObservable();

  constructor(private ngZone: NgZone) {}

  connect(tenantId: number): void {
    if (this.socket?.connected) {
      return;
    }

    this.tenantId = tenantId;

    // Run socket creation outside Angular zone to avoid triggering change detection on internal events
    this.ngZone.runOutsideAngular(() => {
      this.socket = io(`${environment.WS_SERVER}/api/data/web`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000
      });

      this.socket.on('connect', () => {
        this.subscribeTenant(tenantId);
      });

      this.socket.on('site_status_update', (data: SiteStatusUpdate) => {
        this.ngZone.run(() => {
          this.siteStatusSubject.next({
            site_id: data.site_id,
            connection_status: data.connection_status,
            last_seen: data.last_seen
          });
        });
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('Socket.IO connection error:', error);
      });
    });
  }

  private subscribeTenant(tenantId: number): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_tenant', { tenant_id: tenantId });
    }
  }

  disconnect(): void {
    if (this.socket) {
      if (this.tenantId) {
        this.socket.emit('unsubscribe_tenant', { tenant_id: this.tenantId });
      }
      this.socket.disconnect();
      this.socket = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.siteStatusSubject.complete();
  }
}
