import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { DateService } from '../../services/date.service';

@Component({
  selector: 'app-date-container',
  imports: [CommonModule, MatDatepickerModule, MatNativeDateModule],
  templateUrl: './date-container.component.html',
  styleUrl: './date-container.component.scss'
})
export class DateContainerComponent implements OnInit, OnDestroy {
  currentWeekRange: string = '';
  currentDay: string = '';
  selectedDate: string = '';      
  isHomePage: boolean = false;
  showPopup: boolean = false;

  private routerSubscription: Subscription = new Subscription();

  constructor(
    private router: Router,
    private dateService: DateService // Inject the DateService
  ) {}

  ngOnInit(): void {
    this.setCurrentWeekRange();
    this.setCurrentDay();

    // Set initial date
    const initialDate = new Date();
    this.selectedDate = this.formatDate(initialDate);
    
    // Use DateService instead of emitting
    this.dateService.setSelectedDate(initialDate);

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
    this.selectedDate = this.formatDate(date);
    
    // Use DateService to broadcast the date change instead of emitting
    this.dateService.setSelectedDate(date);
    
    if (this.isHomePage) {
      this.updateWeekRangeFromDate(date);
    } else {
      this.updateDayFromDate(date);
    }
  
    this.showPopup = false;
  }

  private updateWeekRangeFromDate(date: Date): void {
    this.currentWeekRange = this.buildWeekRange(date);
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
    this.currentWeekRange = this.buildWeekRange(today);
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

  private buildWeekRange(endDate: Date): string {
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);

    const startMonth = (startDate.getMonth() + 1).toString().padStart(2, '0');
    const startDay   = startDate.getDate().toString().padStart(2, '0');
    const endMonth   = (endDate.getMonth() + 1).toString().padStart(2, '0');
    const endDay     = endDate.getDate().toString().padStart(2, '0');

    return `${startMonth}/${startDay} - ${endMonth}/${endDay}`;
  }
}
