import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

@Component({
  selector: 'app-back',
  imports: [CommonModule],
  templateUrl: './back.component.html',
  styleUrl: './back.component.scss'
})
export class BackComponent {
  @Output() backClick = new EventEmitter<void>();

  constructor(private location: Location) {}

  goBack(): void {
    this.backClick.emit();
    // Alternatively, use browser's back navigation
    this.location.back();
  }
}
