import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-see-history-button',
  imports: [],
  templateUrl: './see-history-button.component.html',
  styleUrl: './see-history-button.component.scss'
})
export class SeeHistoryButtonComponent {
  @Input() buttonText: string = '歷史紀錄';
}
