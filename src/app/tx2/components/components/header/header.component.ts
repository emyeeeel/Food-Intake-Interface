import { Component, OnInit } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { SearchBarComponent } from "../../components/search-bar/search-bar.component";
import { NotifComponent } from "../notification/notification.component";

interface MenuOption {
  text: string;
  isSelected: boolean;
  path?: string;             
  children?: MenuOption[];   
  isDropdownOpen?: boolean;
}

@Component({
  selector: 'app-header',
  imports: [MatIconModule, CommonModule, SearchBarComponent, NotifComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  username: string = '';
  ltcname: string = environment.careCenterName;

  menuOptions: MenuOption[] = [
    { text: '首頁', isSelected: false, path: 'home', isDropdownOpen: false },
    { text: '膳食攝取記錄', isSelected: false, path: 'intakes', isDropdownOpen: false },
    { 
      text: '膳食目錄', 
      isSelected: false, 
      path: 'meals',
      isDropdownOpen: false,
      children: [
        { text: '添加餐點', isSelected: false, path: 'meal-catalog/add' },
        { text: '所有餐點', isSelected: false, path: 'meal-catalog/all' },
      ] 
    },
    { text: '食材', isSelected: false, path: 'ingredients', isDropdownOpen: false },
    { 
      text: '住民資料', 
      isSelected: false, 
      path: 'patients', 
      isDropdownOpen: false,
      children: [
        { text: '新增患者', isSelected: false, path: 'patient-info/add' },
        { text: '所有患者', isSelected: false, path: 'patient-info/all' },
      ] 
    },
    { text: '設定', isSelected: false, path: 'settings', isDropdownOpen: false },
  ];
  

  constructor(private auth: Auth, private router: Router) {}

  ngOnInit(): void {
    this.loadUsername();

    // Check initial route
    this.updateSelectedOption(this.router.url);

    // Listen for route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateSelectedOption(event.url);
      });
  }

  private loadUsername(): void {
    onAuthStateChanged(this.auth, (user: User | null) => {
      if (user && user.email) {
        const emailPrefix = user.email.split('@')[0];
        this.username = emailPrefix.toUpperCase();
      } else {
        this.loadFromLocalStorage();
      }
    });
  }

  private loadFromLocalStorage(): void {
    const storedEmail = localStorage.getItem('email') || 
      localStorage.getItem('userEmail') || 
      localStorage.getItem('loggedEmail') || 
      localStorage.getItem('firebaseEmail');

    if (storedEmail) {
      const emailPrefix = storedEmail.split('@')[0];
      this.username = emailPrefix.toUpperCase();
    } else {
      const storedUsername = localStorage.getItem('username');
      this.username = storedUsername || 'USER';
    }
  }

  private updateSelectedOption(currentUrl: string) {
    const currentPath = currentUrl.replace(/^\//, '');
    this.menuOptions.forEach(option => option.isSelected = false);
    const matchingOption = this.menuOptions.find(option => option.path === currentPath || currentPath.startsWith(option.path + '/'));
    if (matchingOption) {
      matchingOption.isSelected = true;
    }
  }

  selectOption(selectedOption: MenuOption) {
    if (selectedOption.path) {
      this.router.navigate([selectedOption.path]);
      this.updateSelectedOption('/' + selectedOption.path);
    }
    // Close all dropdowns
    this.menuOptions.forEach(option => option.isDropdownOpen = false);
  }  
  
}
