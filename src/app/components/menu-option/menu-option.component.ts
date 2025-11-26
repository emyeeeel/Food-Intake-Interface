import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface MenuOption {
  text: string;
  defaultIcon: string;
  selectedIcon: string;
  isSelected: boolean;
  path: string;
}

@Component({
  selector: 'app-menu-option',
  imports: [CommonModule],
  templateUrl: './menu-option.component.html',
  styleUrl: './menu-option.component.scss'
})
export class MenuOptionComponent implements OnInit {
  menuOptions: MenuOption[] = [
    {
      text: '首頁',
      defaultIcon: 'assets/icons/home-icon.svg',
      selectedIcon: 'assets/icons/home-icon-selected.svg',
      isSelected: false,
      path: 'home'
    },
    {
      text: '膳食攝取記錄',
      defaultIcon: 'assets/icons/meal-intake-icon.svg',
      selectedIcon: 'assets/icons/meal-intake-icon-selected.svg',
      isSelected: false,
      path: 'meal-intake'
    },
    {
      text: '膳食目錄',
      defaultIcon: 'assets/icons/meal-icon.svg',
      selectedIcon: 'assets/icons/meal-icon-selected.svg',
      isSelected: false,
      path: 'meal-catalog'
    },
    {
      text: '食材',
      defaultIcon: 'assets/icons/ingredients-icon.svg',
      selectedIcon: 'assets/icons/ingredients-icon-selected.svg',
      isSelected: false,
      path: 'ingredients'
    },
    {
      text: '住民資料',
      defaultIcon: 'assets/icons/patient-info-icon.svg',
      selectedIcon: 'assets/icons/patient-info-icon-selected.svg',
      isSelected: false,
      path: 'patient-info'
    },
    {
      text: '設定',
      defaultIcon: 'assets/icons/settings-icon.svg',
      selectedIcon: 'assets/icons/settings-icon-selected.svg',
      isSelected: false,
      path: 'settings'
    },
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // Check initial route
    this.updateSelectedOption(this.router.url);

    // Listen for route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateSelectedOption(event.url);
      });
  }

  // Check path and if matches any of Menu Option's path or sub-paths, let the icon be selected icon
  private updateSelectedOption(currentUrl: string) {
    // Remove leading slash and get the current path
    const currentPath = currentUrl.replace(/^\//, '');
    
    // Reset all selections
    this.menuOptions.forEach(option => option.isSelected = false);
    
    // Find matching option, including sub-paths
    const matchingOption = this.menuOptions.find(option => {
      // Check for exact match
      if (option.path === currentPath) {
        return true;
      }
      
      // Check for sub-paths (e.g., meal-catalog/add should match meal-catalog)
      if (currentPath.startsWith(option.path + '/')) {
        return true;
      }
      
      return false;
    });
    
    if (matchingOption) {
      matchingOption.isSelected = true;
    }
  }

  selectOption(selectedOption: MenuOption) {
    // Navigate to the selected option's path
    this.router.navigate([selectedOption.path]);
    
    // Update selection (will also be handled by route change listener)
    this.updateSelectedOption('/' + selectedOption.path);
  }
}