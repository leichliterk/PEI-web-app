import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
}

export interface AppUser {
  _id: string;
  fname: string;
  lname: string;
  email: string;
  auth0_id: string;
  role: string;
  status: string;
  group: string;
  tenant_id: number;
  site_ids: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  private appUserSubject: BehaviorSubject<AppUser | null> = new BehaviorSubject<AppUser | null>(null);
  public appUser$: Observable<AppUser | null> = this.appUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<User | null>(null);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get appUserValue(): AppUser | null {
    return this.appUserSubject.value;
  }

  public get isAdmin(): boolean {
    return this.appUserSubject.value?.role === 'admin';
  }

  getInitials(): string {
    const user = this.currentUserValue;
    if (!user) return '';

    const firstInitial = user.firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = user.lastName?.charAt(0)?.toUpperCase() || '';

    return `${firstInitial}${lastInitial}`;
  }

  setUser(user: User): void {
    this.currentUserSubject.next(user);
  }

  clearUser(): void {
    this.currentUserSubject.next(null);
    this.appUserSubject.next(null);
  }

  fetchAppUser(email: string): Observable<AppUser> {
    return this.http.get<AppUser>(`${environment.API_SERVER}/user/email/${encodeURIComponent(email)}`).pipe(
      tap(appUser => this.appUserSubject.next(appUser))
    );
  }
}