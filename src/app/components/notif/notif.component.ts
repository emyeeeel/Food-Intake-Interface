import { Component, OnInit } from '@angular/core';
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
  styleUrl: './notif.component.scss'
})
export class NotifComponent implements OnInit {
  isDropdownOpen: boolean = false;
  activeFilter: 'all' | 'unread' = 'all';
  
  notifications: Notification[] = [
    {
      id: 1,
      title: 'Meal Reminder',
      message: 'Time for your lunch meal intake',
      time: '5 min ago',
      read: false
    },
    {
      id: 2,
      title: 'Report Ready',
      message: 'Your weekly report is now available',
      time: '1 hour ago',
      read: false
    },
    {
      id: 3,
      title: 'Goal Achieved',
      message: 'Congratulations! You met your daily goal',
      time: '2 hours ago',
      read: true
    },
    {
      id: 4,
      title: 'System Update',
      message: 'New features have been added to your dashboard',
      time: '1 day ago',
      read: true
    }
  ];

  get notificationCount(): number {
    return this.notifications.filter(notification => !notification.read).length;
  }

  get filteredNotifications(): Notification[] {
    if (this.activeFilter === 'unread') {
      return this.notifications.filter(notification => !notification.read);
    }
    return this.notifications;
  }

  ngOnInit(): void {
    
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
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      console.log(`Notification ${notificationId} marked as read`);
      
      if (this.activeFilter === 'unread' && this.notificationCount === 0) {
        this.activeFilter = 'all';
      }
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    console.log('All notifications marked as read');
  }

  addNewNotification(notification: Omit<Notification, 'id'>): void {
    const newId = Math.max(...this.notifications.map(n => n.id)) + 1;
    this.notifications.unshift({
      ...notification,
      id: newId
    });
  }
}
