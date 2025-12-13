import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-tags',
  imports: [CommonModule],
  templateUrl: './tags.component.html',
  styleUrl: './tags.component.scss'
})
export class TagsComponent {
  @Input() tagText: string = '';
  @Input() showCloseButton: boolean = true; 
  
  @Output() closeTag = new EventEmitter<void>();

  isVisible: boolean = true;

  onClose(): void {
    this.isVisible = false;  
    this.closeTag.emit();     
  }
}