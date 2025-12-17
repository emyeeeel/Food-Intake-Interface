import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AddIntakeComponent } from "../add-intake/add-intake.component";

interface SegmentationResult {
  segmented_image_url: string;
  num_classes: number;
  class_names: string[];
  raw_weight?: number;         
  estimated_volumes_ml?: { [className: string]: number };
}

interface ApiResult {
  status: string;
  results: {
    before: SegmentationResult;
    after: SegmentationResult;
  };
}

@Component({
  selector: 'app-display-intake',
  imports: [CommonModule, AddIntakeComponent],
  templateUrl: './display-intake.component.html',
  styleUrls: ['./display-intake.component.scss']
})
export class DisplayIntakeComponent implements OnInit {

  beforeResult: SegmentationResult | null = null;
  afterResult: SegmentationResult | null = null;
  loading: boolean = true;
  error: string | null = null;
  showIntakeResults: boolean = false;
  isCalculating: boolean = false;
  intakeData: any = {};

  private apiUrl = 'https://h3vkhzth-8000.asse.devtunnels.ms/api/segment/results/';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchSegmentationResults();
  }

  fetchSegmentationResults(): void {
    this.loading = true;
    this.http.get<ApiResult>(this.apiUrl)
      .pipe(
        catchError(err => {
          this.error = 'Failed to fetch segmentation results.';
          this.loading = false;
          return of(null);
        })
      )
      .subscribe(data => {
        this.loading = false;
        if (data?.status === 'success') {
          this.beforeResult = data.results.before;
          this.afterResult = data.results.after;

          // Debug logs
          console.log('Before:', this.beforeResult);
          console.log('After:', this.afterResult);
        } else {
          this.error = 'No results found.';
        }
      });
  }

  calculateIntake(): void {
    this.isCalculating = true;
    
    // Simulate calculation process
    setTimeout(() => {
      this.generateMockIntakeData();
      this.showIntakeResults = true;
      this.isCalculating = false;
    }, 2000);
  }

  goBackToResults(): void {
    this.showIntakeResults = false;
  }

  private generateMockIntakeData(): void {
  
    const beforeWeight = this.beforeResult?.raw_weight || 0;
    const afterWeight = this.afterResult?.raw_weight || 0;
    const weightConsumed = Math.round(Math.max(0, beforeWeight - afterWeight) * 100) / 100;

    // Calculate total volume for before
    let beforeTotalVolume = 0;
    if (this.beforeResult?.estimated_volumes_ml) {
      for (const key in this.beforeResult.estimated_volumes_ml) {
        beforeTotalVolume += this.beforeResult.estimated_volumes_ml[key];
      }
    }
    beforeTotalVolume = Math.round(beforeTotalVolume * 100) / 100; // 2 decimal places

    // Calculate total volume for after
    let afterTotalVolume = 0;
    if (this.afterResult?.estimated_volumes_ml) {
      for (const key in this.afterResult.estimated_volumes_ml) {
        afterTotalVolume += this.afterResult.estimated_volumes_ml[key];
      }
    }
    afterTotalVolume = Math.round(afterTotalVolume * 100) / 100; // 2 decimal places

    // Calculate volume consumed
    const volumeConsumed = Math.round(Math.max(0, beforeTotalVolume - afterTotalVolume) * 100) / 100;
    
    // Calculate consumption percentage
    const volumePercentage = beforeTotalVolume > 0 ? Math.round((volumeConsumed / beforeTotalVolume) * 100 * 100) / 100 : 0;

    // Generate item details based on actual data
    const itemDetails: any[] = [];
    if (this.beforeResult?.estimated_volumes_ml && this.afterResult?.estimated_volumes_ml) {
      // Get all unique keys from both before and after
      const allKeys = new Set([
        ...Object.keys(this.beforeResult.estimated_volumes_ml),
        ...Object.keys(this.afterResult.estimated_volumes_ml)
      ]);

      allKeys.forEach(key => {
        const beforeVolume = this.beforeResult?.estimated_volumes_ml?.[key] || 0;
        const afterVolume = this.afterResult?.estimated_volumes_ml?.[key] || 0;
        const consumed = Math.max(0, beforeVolume - afterVolume);
        const percentage = beforeVolume > 0 ? Math.round((consumed / beforeVolume) * 100 * 100) / 100 : 0;

        if (beforeVolume > 0) { // Only include items that were present before
          itemDetails.push({
            name: key,
            before: Math.round(beforeVolume * 100) / 100,
            after: Math.round(afterVolume * 100) / 100,
            consumed: Math.round(consumed * 100) / 100,
            percentage: percentage
          });
        }
      });
    }

    this.intakeData = {
      totalItems: itemDetails.length,
      totalWeight: weightConsumed,
      totalVolume: volumeConsumed,
      beforeTotalVolume: beforeTotalVolume,
      afterTotalVolume: afterTotalVolume,
      consumptionPercentage: volumePercentage,
      itemDetails: itemDetails
    };

    console.log('Intake Data:', this.intakeData);
  }
}
