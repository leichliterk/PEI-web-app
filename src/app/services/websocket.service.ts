import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { SiteDataReading } from './site.service';

export interface SiteStatusUpdate {
  site_id: number;
  connection_status: boolean;
  last_seen?: string;
}

export interface WsNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: any;
  created_at: string;
}

export interface ServiceStatus {
  state: 'running' | 'stopped' | 'unknown';
  updatedAt?: string | null;
}

export interface FtpStatus {
  paused: boolean;
  queueDepth: number;
  updatedAt?: string | null;
}

export interface TagReading {
  name: string;
  value: number | boolean | string | null;
  error: string | null;
}

export interface PlcSnapshot {
  timestamp: string;
  tags: TagReading[];
}

export interface DiscoveredTag {
  name: string;
  typeCode: string;
  dimensions: number[];
  scope: string;
  displayType: string;
  isArray: boolean;
  isPollingSupported: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  private siteStatusSubject = new Subject<SiteStatusUpdate>();
  private notificationSubject = new Subject<WsNotification>();
  private siteDataSubject = new Subject<SiteDataReading>();
  private serviceStatusSubject = new Subject<ServiceStatus>();
  private ftpStatusSubject = new Subject<FtpStatus>();
  private plcSnapshotSubject = new Subject<PlcSnapshot>();
  private plcTagsSubject = new Subject<DiscoveredTag[]>();
  private tenantId: number | null = null;
  private auth0Id: string | null = null;

  siteStatus$: Observable<SiteStatusUpdate> = this.siteStatusSubject.asObservable();
  notification$: Observable<WsNotification> = this.notificationSubject.asObservable();
  siteData$: Observable<SiteDataReading> = this.siteDataSubject.asObservable();
  serviceStatus$: Observable<ServiceStatus> = this.serviceStatusSubject.asObservable();
  ftpStatus$: Observable<FtpStatus> = this.ftpStatusSubject.asObservable();
  plcSnapshot$: Observable<PlcSnapshot> = this.plcSnapshotSubject.asObservable();
  plcTags$: Observable<DiscoveredTag[]> = this.plcTagsSubject.asObservable();

  constructor(private ngZone: NgZone) {}

  connect(tenantId: number): void {
    if (this.socket?.connected) {
      return;
    }

    this.tenantId = tenantId;

    this.ngZone.runOutsideAngular(() => {
      this.socket = io(`${environment.WS_SERVER}/api/data/web`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000
      });

      this.socket.on('connect', () => {
        this.subscribeTenant(tenantId);
        if (this.auth0Id) {
          this.emitIdentify(this.auth0Id);
        }
      });

      this.socket.on('site_status_update', (data: SiteStatusUpdate) => {
        this.ngZone.run(() => this.siteStatusSubject.next(data));
      });

      this.socket.on('notification', (data: WsNotification) => {
        this.ngZone.run(() => this.notificationSubject.next(data));
      });

      this.socket.on('site_data', (data: SiteDataReading) => {
        this.ngZone.run(() => this.siteDataSubject.next(data));
      });

      this.socket.on('service:status', (data: ServiceStatus) => {
        this.ngZone.run(() => this.serviceStatusSubject.next(data));
      });

      this.socket.on('ftp:status', (data: FtpStatus) => {
        this.ngZone.run(() => this.ftpStatusSubject.next(data));
      });

      this.socket.on('plc:snapshot', (data: PlcSnapshot) => {
        this.ngZone.run(() => this.plcSnapshotSubject.next(data));
      });

      this.socket.on('plc:tags', (data: DiscoveredTag[]) => {
        this.ngZone.run(() => this.plcTagsSubject.next(data));
      });

      this.socket.on('connect_error', (error: Error) => {
        console.error('Socket.IO connection error:', error);
      });
    });
  }

  identify(auth0Id: string): void {
    this.auth0Id = auth0Id;
    if (this.socket?.connected) {
      this.emitIdentify(auth0Id);
    }
  }

  joinRoom(room: string): void {
    this.socket?.emit('join_room', { room });
  }

  leaveRoom(room: string): void {
    this.socket?.emit('leave_room', { room });
  }

  private emitIdentify(auth0Id: string): void {
    this.socket?.emit('user:identify', { auth0_id: auth0Id });
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
    this.auth0Id = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.siteStatusSubject.complete();
    this.notificationSubject.complete();
    this.siteDataSubject.complete();
    this.serviceStatusSubject.complete();
    this.ftpStatusSubject.complete();
    this.plcSnapshotSubject.complete();
    this.plcTagsSubject.complete();
  }
}