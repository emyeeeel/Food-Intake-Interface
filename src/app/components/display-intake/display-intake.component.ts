import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IntakeService } from '../../services/intake.service';
import { IntakeRecord } from '../../models/food-intake.model';
import { IntakeLogComponent } from '../intake-log/intake-log.component';
import { EstimationService } from '../../services/estimate.service';
import { EstimationResult } from '../../models/estimation.model';

@Component({
  selector: 'app-display-intake',
  imports: [CommonModule, IntakeLogComponent],
  templateUrl: './display-intake.component.html',
  styleUrls: ['./display-intake.component.scss']
})
export class DisplayIntakeComponent implements OnInit {

  volumeRecords: EstimationResult[] = [];

  intakes: IntakeRecord[] = [];

  constructor(private intakeService: IntakeService, private estimateService: EstimationService) {}

  ngOnInit(): void {
    this.intakeService.getIntakes().subscribe({
      next: (records) => {
        this.intakes = records;
        console.log('All intake records:', records);
      },
      error: (err) => {
        console.error('Failed to fetch intake records:', err);
      }
    });
    this.estimateService.getResultsByIntakeId(41).subscribe({
      next: (records) => {
        this.volumeRecords = records;
        console.log('Volume Record:', records);
      },
      error: (err) => {
        console.error('Failed to fetch volume records:', err);
      }
    });
  }
}