import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  firstName: string;
  lastName: string;
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  constructor() {
    // For now, using mock data. Replace with actual authentication service later
    const mockUser: User = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com'
    };

    this.currentUserSubject = new BehaviorSubject<User | null>(mockUser);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
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
  }
}
