import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { catchError, forkJoin, Observable, of, switchMap } from 'rxjs';
import { IntakeService } from '../../services/intake.service';
import { ActivatedRoute } from '@angular/router';
import { EstimationService } from '../../services/estimate.service';
import { IntakeRecord } from '../../models/food-intake.model';

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

interface EstimationResult{
  id: number;
  total_volume_ml: number
  food_items: FoodItem[];
  segmented_image: string;
}

interface FoodItem {
  id: number;
  food_class: string;
  confidence_score: number;
  volume_ml: number;
}

@Component({
  selector: 'app-view-intake',
  imports: [CommonModule],
  templateUrl: './view-intake.component.html',
  styleUrl: './view-intake.component.scss',
})
export class ViewIntakeComponent implements OnInit {
  beforeResult: SegmentationResult | null = null;
  afterResult: SegmentationResult | null = null;
  loading: boolean = true;
  error: string | null = null;
  showIntakeResults: boolean = false;
  isCalculating: boolean = false;
  intakeData: any = {};

  estimationBefore: EstimationResult | null = null;
  estimationAfter: EstimationResult | null = null;

  private apiUrl = 'https://q30gkzkn-8000.asse.devtunnels.ms/api/segment/results/';
  // private apiUrl = 'http://127.0.0.1:8000/api/segment/results/';
  
  ltcpatiendid!: number;
  intakeId!: number;

  beforeIntake: IntakeRecord | null = null;
  afterIntake: IntakeRecord | null = null;

  constructor(private http: HttpClient, private intakeService: IntakeService, private route: ActivatedRoute, private estimationService: EstimationService) { }

  ngOnInit(): void {
    this.ltcpatiendid = Number(this.route.snapshot.paramMap.get('id'));
    this.intakeId = Number(this.route.snapshot.paramMap.get('intakeId'));

    console.log('Patient ID:', this.ltcpatiendid);
    console.log('Intake ID:', this.intakeId);

    this.intakeService
    .getIntakesByPatientDateAndMealPeriod(this.ltcpatiendid, '午餐')
    .subscribe(intakes => {
      console.log('Filtered Intakes:', intakes);
    });

    this.loadPairedIntake();

    // this.estimationService.getResultsByIntakeId(this.intakeId)
    // .subscribe(results => {
    //   const mappedResults: EstimationResult[] = this.mapEstimationResults(results);
    //   console.log('Mapped Estimation Results:', mappedResults);

    //   // Example: take the first (latest) result
    //   if (mappedResults.length > 0) {
    //     const latestResult = mappedResults[0];
    //     console.log('Latest Estimation Result:', latestResult);
    //     console.log('Food Items:', latestResult.food_items);
    //   }
    // }, err => {
    //   console.error('Failed to fetch estimation results:', err);
    // });

    this.fetchSegmentationResults();
  }

  private mapEstimationResults(results: any[]): EstimationResult[] {
    return results.map(res => ({
      id: res.id,
      total_volume_ml: res.total_volume_ml,
      segmented_image: res.segmented_image,
      food_items: (res.food_items || []).map((item: any) => ({
        id: item.id,
        food_class: item.food_class,
        confidence_score: item.confidence_score,
        volume_ml: item.volume_ml
      }))
    }));
  }

  // private loadPairedIntake(): void {
  //   // Fetch the intake by ID
  //   this.intakeService.getIntakeById(this.intakeId).subscribe(intake => {
  //     if (!intake) {
  //       this.error = 'Intake not found';
  //       this.loading = false;
  //       return;
  //     }

  //     // Safely cast mealPeriod and phase
  //     const mealPeriod = intake.meal_detail.meal_time as '午餐' | '晚餐';
  //     const phase = intake.meal_phase as '前' | '後';

  //     console.log('Fetched Intake:', intake);
  //     console.log('Meal period:', mealPeriod, 'Phase:', phase);

  //     // Parse the intake date
  //     const intakeDate = new Date(intake.recorded_at);

  //     if (phase === '後') {
  //       // After meal: find the corresponding BEFORE intake for the same patient, meal, and date
  //       this.intakeService
  //         .getIntakesByPatientDateAndMealPeriod(this.ltcpatiendid, mealPeriod, intakeDate)
  //         .subscribe(intakes => {
  //           // Filter for before-phase intake
  //           const beforeIntake = intakes.find(i => (i.meal_phase as '前' | '後') === '前');

  //           if (beforeIntake) {
  //             console.log('Corresponding BEFORE Intake:', beforeIntake);
  //           } else {
  //             console.warn('No corresponding BEFORE intake found for this date and meal period');
  //           }

  //           console.log('AFTER Intake:', intake);
  //         }, err => {
  //           console.error('Failed to fetch paired intakes:', err);
  //         });

  //     } else {
  //       // Before meal: only this intake matters
  //       console.log('BEFORE Intake (self):', intake);
  //     }
  //   }, err => {
  //     this.error = 'Failed to load intake';
  //     this.loading = false;
  //   });
  // }

  private loadPairedIntake(): void {
  this.intakeService.getIntakeById(this.intakeId).subscribe(intake => {
    if (!intake) {
      this.error = 'Intake not found';
      this.loading = false;
      return;
    }

    const mealPeriod = intake.meal_detail.meal_time as '午餐' | '晚餐';
    const phase = intake.meal_phase as '前' | '後';
    const intakeDate = new Date(intake.recorded_at);

    if (phase === '前') {
      // Only show this intake's estimation — no pairing, no calculation
      this.beforeIntake = intake;
      this.afterIntake = null;

      this.estimationService.getResultsByIntakeId(intake.id).subscribe(results => {
        this.estimationBefore = results ? this.mapEstimationResults(results)[0] : null;
        this.estimationAfter  = null;
        this.loading = false;
      });

    } else if (phase === '後') {
      // Store the after intake, then find its corresponding before intake
      this.afterIntake = intake;

      const afterEstimation$ = this.estimationService.getResultsByIntakeId(intake.id);

      const beforeEstimation$ = this.intakeService
        .getIntakesByPatientDateAndMealPeriod(this.ltcpatiendid, mealPeriod, intakeDate)
        .pipe(
          switchMap(intakes => {
            const beforeIntake = intakes.find(i => i.meal_phase === '前');
            if (beforeIntake) {
              this.beforeIntake = beforeIntake;
              return this.estimationService.getResultsByIntakeId(beforeIntake.id);
            }
            console.warn('No matching before intake found');
            this.beforeIntake = null;
            return of(null);
          })
        );

      forkJoin([beforeEstimation$, afterEstimation$]).subscribe(
        ([beforeResults, afterResults]) => {
          this.estimationBefore = beforeResults ? this.mapEstimationResults(beforeResults)[0] : null;
          this.estimationAfter  = afterResults  ? this.mapEstimationResults(afterResults)[0]  : null;
          this.loading = false;
        },
        err => {
          console.error('Failed to fetch estimation results:', err);
          this.error = 'Failed to fetch estimation results';
          this.loading = false;
        }
      );
    }
  }, err => {
    this.error = 'Failed to load intake';
    this.loading = false;
  });
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

  // private generateMockIntakeData(): void {
  
  //   const beforeWeight = this.beforeResult?.raw_weight || 0;
  //   const afterWeight = this.afterResult?.raw_weight || 0;
  //   const weightConsumed = Math.round(Math.max(0, beforeWeight - afterWeight) * 100) / 100;

  //   // Calculate total volume for before
  //   let beforeTotalVolume = 0;
  //   if (this.beforeResult?.estimated_volumes_ml) {
  //     for (const key in this.beforeResult.estimated_volumes_ml) {
  //       beforeTotalVolume += this.beforeResult.estimated_volumes_ml[key];
  //     }
  //   }
  //   beforeTotalVolume = Math.round(beforeTotalVolume * 100) / 100; // 2 decimal places

  //   // Calculate total volume for after
  //   let afterTotalVolume = 0;
  //   if (this.afterResult?.estimated_volumes_ml) {
  //     for (const key in this.afterResult.estimated_volumes_ml) {
  //       afterTotalVolume += this.afterResult.estimated_volumes_ml[key];
  //     }
  //   }
  //   afterTotalVolume = Math.round(afterTotalVolume * 100) / 100; // 2 decimal places

  //   // Calculate volume consumed
  //   const volumeConsumed = Math.round(Math.max(0, beforeTotalVolume - afterTotalVolume) * 100) / 100;
    
  //   // Calculate consumption percentage
  //   const volumePercentage = beforeTotalVolume > 0 ? Math.round((volumeConsumed / beforeTotalVolume) * 100 * 100) / 100 : 0;

  //   // Generate item details based on actual data
  //   const itemDetails: any[] = [];
  //   if (this.beforeResult?.estimated_volumes_ml && this.afterResult?.estimated_volumes_ml) {
  //     // Get all unique keys from both before and after
  //     const allKeys = new Set([
  //       ...Object.keys(this.beforeResult.estimated_volumes_ml),
  //       ...Object.keys(this.afterResult.estimated_volumes_ml)
  //     ]);

  //     allKeys.forEach(key => {
  //       const beforeVolume = this.beforeResult?.estimated_volumes_ml?.[key] || 0;
  //       const afterVolume = this.afterResult?.estimated_volumes_ml?.[key] || 0;
  //       const consumed = Math.max(0, beforeVolume - afterVolume);
  //       const percentage = beforeVolume > 0 ? Math.round((consumed / beforeVolume) * 100 * 100) / 100 : 0;

  //       if (beforeVolume > 0) { // Only include items that were present before
  //         itemDetails.push({
  //           name: key,
  //           before: Math.round(beforeVolume * 100) / 100,
  //           after: Math.round(afterVolume * 100) / 100,
  //           consumed: Math.round(consumed * 100) / 100,
  //           percentage: percentage
  //         });
  //       }
  //     });
  //   }

  //   this.intakeData = {
  //     totalItems: itemDetails.length,
  //     totalWeight: weightConsumed,
  //     totalVolume: volumeConsumed,
  //     beforeTotalVolume: beforeTotalVolume,
  //     afterTotalVolume: afterTotalVolume,
  //     consumptionPercentage: volumePercentage,
  //     itemDetails: itemDetails
  //   };

  //   console.log('Intake Data:', this.intakeData);
  // }

  private generateMockIntakeData(): void {
  const beforeTotalVolume = this.estimationBefore?.total_volume_ml || 0;
  const afterTotalVolume  = this.estimationAfter?.total_volume_ml || 0;

  const volumeConsumed = Math.max(0, beforeTotalVolume - afterTotalVolume);
  const volumePercentage = beforeTotalVolume > 0
    ? Math.round((volumeConsumed / beforeTotalVolume) * 100 * 100) / 100
    : 0;

  const itemDetails: any[] = [];

  if (this.estimationBefore) {
    // Use after items if available, otherwise default volumes to 0
    const afterItemsMap = new Map<string, FoodItem>();
    if (this.estimationAfter) {
      this.estimationAfter.food_items.forEach(f => afterItemsMap.set(f.food_class, f));
    }

    this.estimationBefore.food_items.forEach(beforeItem => {
      const afterItem = afterItemsMap.get(beforeItem.food_class);
      const beforeVol = beforeItem.volume_ml || 0;
      const afterVol  = afterItem?.volume_ml || 0;
      const consumed  = Math.max(0, beforeVol - afterVol);
      const percentage = beforeVol > 0 ? Math.round((consumed / beforeVol) * 100 * 100) / 100 : 0;

      itemDetails.push({
        name: beforeItem.food_class,
        before: beforeVol,
        after: afterVol,   // 0 if afterItem is missing
        consumed: consumed,
        percentage: percentage
      });
    });
  }

  this.intakeData = {
    totalItems: itemDetails.length,
    totalVolume: volumeConsumed,
    consumptionPercentage: volumePercentage,
    itemDetails: itemDetails,
    beforeTotalVolume: beforeTotalVolume,
    afterTotalVolume: afterTotalVolume,
  };

  console.log('Intake Data (from EstimationResult):', this.intakeData);
}
}
