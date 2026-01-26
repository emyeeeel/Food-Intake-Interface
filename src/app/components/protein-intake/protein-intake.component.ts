import { Component } from '@angular/core';
import { SeeHistoryButtonComponent } from "../see-history-button/see-history-button.component";

@Component({
  selector: 'app-protein-intake',
  imports: [SeeHistoryButtonComponent],
  templateUrl: './protein-intake.component.html',
  styleUrl: './protein-intake.component.scss',
})
export class ProteinIntakeComponent {
  recommendedProteinIntake: string = '00';
}
