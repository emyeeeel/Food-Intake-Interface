import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dark-button',
  imports: [],
  templateUrl: './dark-button.component.html',
  styleUrl: './dark-button.component.scss'
})
export class DarkButtonComponent {
  @Input() buttonText: string = '';
}
