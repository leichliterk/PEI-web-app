import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { WebSocketService } from './websocket.service';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: any;
  created_at: string;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.notifications$.pipe(map(ns => ns.filter(n => !n.read).length));

  constructor(
    private http: HttpClient,
    private webSocketService: WebSocketService
  ) {
    this.webSocketService.notification$.subscribe(wsNotif => {
      const notification: AppNotification = { ...wsNotif, read: false };
      this.notificationsSubject.next([notification, ...this.notificationsSubject.value]);
    });
  }

  loadUserNotifications(auth0_id: string): void {
    this.http.get<any>(
      `${environment.API_SERVER}/notifications/user/${encodeURIComponent(auth0_id)}?limit=50`
    ).subscribe({
      next: (response) => {
        // API may return an array directly or wrap it in an object
        const notifications: AppNotification[] = Array.isArray(response)
          ? response
          : (response?.notifications ?? response?.data ?? []);
        this.notificationsSubject.next(notifications);
      },
      error: (err) => console.error('Failed to load notifications:', err)
    });
  }

  markRead(id: string): void {
    this.http.patch(`${environment.API_SERVER}/notifications/${id}/read`, {}).subscribe({
      next: () => {
        const updated = this.notificationsSubject.value.map(n =>
          n.id === id ? { ...n, read: true } : n
        );
        this.notificationsSubject.next(updated);
      },
      error: (err) => console.error('Failed to mark notification read:', err)
    });
  }

  markAllRead(auth0_id: string): void {
    this.http.post(
      `${environment.API_SERVER}/notifications/user/${encodeURIComponent(auth0_id)}/read-all`,
      {}
    ).subscribe({
      next: () => {
        const updated = this.notificationsSubject.value.map(n => ({ ...n, read: true }));
        this.notificationsSubject.next(updated);
      },
      error: (err) => console.error('Failed to mark all notifications read:', err)
    });
  }
}
