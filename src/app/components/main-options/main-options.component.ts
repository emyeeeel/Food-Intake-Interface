import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-options',
  imports: [CommonModule],
  templateUrl: './main-options.component.html',
  styleUrl: './main-options.component.scss'
})
export class MainOptionsComponent {
  @Input() iconSrc: string = '';
  @Input() optionText: string = '';
  @Input() altText: string = '';
  @Input() backgroundColor: string = '#00313C'; 
  @Input() textColor: string = '#E6FEF9'; 

  @Output() clicked = new EventEmitter<void>();

  onClick(): void {
    this.clicked.emit();
  }
}
