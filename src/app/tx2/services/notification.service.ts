import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable } from 'rxjs';

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notifications: Notification[] = [];
  private notificationsSubject = new BehaviorSubject<Notification[]>(this.notifications);
  
  private snackBarDuration = 5000;  // default duration for the snackbar

  constructor(private snackBar: MatSnackBar) {}

  // Fetch the current notifications list as an observable
  getNotifications(): Observable<Notification[]> {
    return this.notificationsSubject.asObservable();
  }

  // Add a notification to the list
  addNotification(notification: Omit<Notification, 'id'>): void {
    const newId = this.notifications.length ? Math.max(...this.notifications.map(n => n.id)) + 1 : 1;
    const newNotification = { ...notification, id: newId };
    this.notifications.unshift(newNotification);
    this.notificationsSubject.next(this.notifications);
    
    // Show the notification via snackbar
    this.snackBar.open(notification.message, '', {
      duration: this.snackBarDuration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['my-custom-snackbar'],
    });
  }

  // Mark a specific notification as read
  markAsRead(notificationId: number): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.notificationsSubject.next(this.notifications);
    }
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
      }
    });
    this.notificationsSubject.next(this.notifications);
  }
}
