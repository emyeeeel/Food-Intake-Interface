import { Component, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss'
})
export class SearchBarComponent {
  isSearchActive: boolean = false;
  searchQuery: string = '';
  
  @ViewChild('searchInput') searchInput!: ElementRef;
  @Output() searchPerformed = new EventEmitter<string>();

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
