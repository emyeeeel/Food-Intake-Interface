import { Component, OnInit } from '@angular/core';
import { NotificationService, NotificationVM as AppNotification } from '../../tx2/services/notification.service';
import { Auth } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';

type NotificationVM = AppNotification & { timeAgo: string };

@Component({
  selector: 'app-notif',
  imports: [CommonModule],
  templateUrl: './notif.component.html',
  styleUrl: './notif.component.scss'
})
export class NotifComponent implements OnInit {
  isDropdownOpen = false;
  activeFilter: 'all' | 'unread' = 'all';

  notifications: NotificationVM[] = [];

  constructor(private notificationService: NotificationService, private auth: Auth) {}

  ngOnInit(): void {
    // Subscribe to the notifications BehaviorSubject
    this.notificationService.getNotifications().subscribe(notifications => {
      this.notifications = notifications;
    });

    // Get the current user UID from Firebase auth
    const user = this.auth.currentUser;
    if (user && user.uid) {
      this.notificationService.fetchNotifications(user.uid);
    } else {
      console.warn('Firebase user UID not available yet');
    }
  }

  get notificationCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  get filteredNotifications(): NotificationVM[] {
    if (this.activeFilter === 'unread') {
      return this.notifications.filter(n => !n.read);
    }
    return this.notifications;
    
  }

  toggleNotificationDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  setFilter(filter: 'all' | 'unread'): void {
    this.activeFilter = filter;
  }

  markAsRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }
}
