import { Component, Input, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  imports: [FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss'
})
export class SearchBarComponent {
  @Input() placeholder = '搜尋...';
  isSearchActive: boolean = false;
  searchQuery: string = '';
  
  @ViewChild('searchInput') searchInput!: ElementRef;
  @Output() searchPerformed = new EventEmitter<string>();
  @Output() searchChanged = new EventEmitter<string>();

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
      this.searchPerformed.emit(this.searchQuery);
      console.log('Searching for:', this.searchQuery);
    }
  }
}
