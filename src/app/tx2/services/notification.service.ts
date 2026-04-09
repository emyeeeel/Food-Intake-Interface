// src/app/services/notification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';

export interface Notification {
  id: number;
  firebase_uid: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string; // ISO string from backend
}

export interface NotificationVM extends Notification {
  timeAgo: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private baseUrl = environment.apiBaseUrl;
  private apiBase = `${this.baseUrl}/api`; // append notifications url in django here
  private notifications: NotificationVM[] = [];
  private notificationsSubject = new BehaviorSubject<NotificationVM[]>(this.notifications);

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  /** Observable for components */
  getNotifications(): Observable<NotificationVM[]> {
    return this.notificationsSubject.asObservable();
  }

  /** Fetch notifications for current Firebase UID */
  async fetchNotifications(firebaseUid: string): Promise<void> {
    if (!firebaseUid) return; // do nothing if UID not provided
    const url = `${this.apiBase}/notifications/?firebase_uid=${firebaseUid}`;
    const notifications = await firstValueFrom(
      this.http.get<Notification[]>(url)
    );

    // Map to NotificationVM with timeAgo
    const mapped = notifications
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(n => ({
        ...n,
        timeAgo: this.getTimeAgo(new Date(n.created_at)),
      }));

    this.notifications = mapped;
    this.notificationsSubject.next(this.notifications);
  }

  /** Mark a notification as read in backend */
  async markAsRead(notificationId: number): Promise<void> {
    const url = `${this.apiBase}/notifications/${notificationId}/read/`; // <-- added /read/
    await firstValueFrom(this.http.patch(url, { read: true }));
    const notif = this.notifications.find(n => n.id === notificationId);
    if (notif) {
      notif.read = true;
      this.notificationsSubject.next(this.notifications);
    }
  }
  

  /** Mark all notifications as read in frontend & backend */
  async markAllAsRead(): Promise<void> {
    for (const n of this.notifications.filter(n => !n.read)) {
      await this.markAsRead(n.id);
    }
  }

  async addNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<void> {
    const url = `${this.apiBase}/notifications/`;
    const created = await firstValueFrom(this.http.post<Notification>(url, notification));
  
    const vm: NotificationVM = {
      ...created,
      timeAgo: this.getTimeAgo(new Date(created.created_at))
    };
  
    // Add to the notifications list
    this.notifications.unshift(vm);
    this.notificationsSubject.next(this.notifications);
  
    // Show snackbar for the new notification
    this.snackBar.open(vm.message, 'Dismiss', {
      duration: 5000, // 5 seconds
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: ['large-snackbar']
    });
  }  
  

  /** Helper: convert date to "time ago" string */
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }
}