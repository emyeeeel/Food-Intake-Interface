import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuBarComponent } from '../../components/menu-bar/menu-bar.component';
import { NotifComponent } from "../../components/notif/notif.component";
import { WelcomeUserComponent } from "../../components/welcome-user/welcome-user.component";
import { SearchBarComponent } from "../../components/search-bar/search-bar.component";
import { DateContainerComponent } from "../../components/date-container/date-container.component";
import { DailyConsumptionComponent } from "../../components/daily-consumption/daily-consumption.component";
import { NutrientIntakeComponent } from "../../components/nutrient-intake/nutrient-intake.component";

@Component({
  selector: 'app-homepage',
  imports: [MenuBarComponent, CommonModule, FormsModule, NotifComponent, WelcomeUserComponent, SearchBarComponent, DateContainerComponent, DailyConsumptionComponent, NutrientIntakeComponent],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.scss'
})
export class HomepageComponent implements OnInit {
  currentWeekRange: string = '';
  isSearchActive: boolean = false;
  searchQuery: string = '';
  
  @ViewChild('searchInput') searchInput!: ElementRef;

  ngOnInit() {
    this.getCurrentWeekRange();
  }

  toggleSearch(): void {
    this.isSearchActive = true;
    // Focus the input after view update
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 0);
  }

  onSearchBlur(): void {
    // Only hide search if no text is entered
    if (!this.searchQuery.trim()) {
      this.isSearchActive = false;
    }
  }

  performSearch(): void {
    if (this.searchQuery.trim()) {
      console.log('Searching for:', this.searchQuery);
      // Implement your search logic here
      // For example: this.searchService.search(this.searchQuery);
    }
  }

  getCurrentWeekRange(): void {
    const today = new Date();
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const formatDate = (date: Date): string => {
      const month = (date.getMonth() + 1).toString();
      const day = date.getDate().toString();
      return `${month}/${day}`;
    };
    
    this.currentWeekRange = `${formatDate(monday)}-${formatDate(sunday)}`;
  }
}
