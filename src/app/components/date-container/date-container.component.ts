import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';


@Component({
  selector: 'app-date-container',
  imports: [CommonModule, MatDatepickerModule, MatNativeDateModule],
  templateUrl: './date-container.component.html',
  styleUrl: './date-container.component.scss'
})
export class DateContainerComponent implements OnInit, OnDestroy {
  currentWeekRange: string = '';
  currentDay: string = '';
  selectedDate: string = '';      // for the input[type="date"]
  isHomePage: boolean = false;
  showPopup: boolean = false;

  private routerSubscription: Subscription = new Subscription();

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.setCurrentWeekRange();
    this.setCurrentDay();

    this.selectedDate = this.formatDate(new Date());

    this.checkCurrentRoute(this.router.url);

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkCurrentRoute(event.url);
      });
  }

  ngOnDestroy(): void {
    this.routerSubscription.unsubscribe();
  }

  togglePopup() {
    this.showPopup = !this.showPopup;
  }

  onCalendarSelected(date: Date) {
    if (this.isHomePage) {
      this.updateWeekRangeFromDate(date);
    } else {
      this.updateDayFromDate(date);
    }
  
    this.showPopup = false;
  }

  private updateWeekRangeFromDate(date: Date) {
    const dayIndex = date.getDay();
  
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - dayIndex);
  
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
  
    const startMonth = (startOfWeek.getMonth() + 1).toString().padStart(2, '0');
    const startDay = startOfWeek.getDate().toString().padStart(2, '0');
  
    const endMonth = (endOfWeek.getMonth() + 1).toString().padStart(2, '0');
    const endDay = endOfWeek.getDate().toString().padStart(2, '0');
  
    this.currentWeekRange = `${startMonth}/${startDay} - ${endMonth}/${endDay}`;
  }

  private updateDayFromDate(date: Date) {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
  
    this.currentDay = `${month}/${day}`;
  }
  

  private checkCurrentRoute(url: string): void {
    const path = url.replace(/^\//, '');
    this.isHomePage = path === 'homepage' || path === 'home' || path === '';
  }

  private setCurrentWeekRange(): void {
    const today = new Date();
    const currentDayIndex = today.getDay();

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDayIndex);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startMonth = (startOfWeek.getMonth() + 1).toString().padStart(2, '0');
    const startDay = startOfWeek.getDate().toString().padStart(2, '0');
    const endMonth = (endOfWeek.getMonth() + 1).toString().padStart(2, '0');
    const endDay = endOfWeek.getDate().toString().padStart(2, '0');

    this.currentWeekRange = `${startMonth}/${startDay} - ${endMonth}/${endDay}`;
  }

  private setCurrentDay(): void {
    const today = new Date();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    this.currentDay = `${month}/${day}`;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }
}
