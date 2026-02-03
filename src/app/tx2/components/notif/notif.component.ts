import { Component, inject, OnInit } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { CommonModule } from '@angular/common';

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-notif',
  imports: [CommonModule],
  templateUrl: './notif.component.html',
  styleUrls: ['./notif.component.scss'],
})
export class NotificationComponent implements OnInit {
  isDropdownOpen: boolean = false;
  activeFilter: 'all' | 'unread' = 'all';

  notifications: Notification[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    // Fetch notifications from the service
    this.notificationService.getNotifications().subscribe((notifications) => {
      this.notifications = notifications;
    });

    // this.notificationService.addNotification({
    //   title: 'New Task',
    //   message: 'You have a new task assigned!',
    //   time: 'Just now',
    //   read: false,
    // });
  }

  get notificationCount(): number {
    return this.notifications.filter((notification) => !notification.read).length;
  }

  get filteredNotifications(): Notification[] {
    if (this.activeFilter === 'unread') {
      return this.notifications.filter((notification) => !notification.read);
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

  // Mark a specific notification as read
  markAsRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId);
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  // Add a new notification (for demonstration purposes)
  addNewNotification(notification: Omit<Notification, 'id'>): void {
    this.notificationService.addNotification(notification);
  }
}