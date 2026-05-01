import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

import { IntakeService } from '../../services/intake.service';


import { IntakeRecord } from '../../models/food-intake.model';
import { EstimationResult, FoodItem } from '../../models/estimation.model';
import { EstimationService } from '../../services/estimate.service';

@Component({
  selector: 'app-view-intake',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-intake.component.html',
  styleUrl: './view-intake.component.scss',
})
export class ViewIntakeComponent implements OnInit {

  loading = true;
  error: string | null = null;

  showIntakeResults = false;
  isCalculating = false;

  ltcpatiendid!: number;
  intakeId!: number;

  beforeIntake: IntakeRecord | null = null;
  afterIntake: IntakeRecord | null = null;

  estimationBefore: EstimationResult | null = null;
  estimationAfter: EstimationResult | null = null;
  altImage: string | null = '';

  intakeData: any = {};

  constructor(
    private intakeService: IntakeService,
    private estimationService: EstimationService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {

    this.ltcpatiendid = Number(this.route.snapshot.paramMap.get('id'));
    this.intakeId = Number(this.route.snapshot.paramMap.get('intakeId'));

    console.log('Patient ID:', this.ltcpatiendid);
    console.log('Intake ID:', this.intakeId);

    this.loadPairedIntake();

    //method to get intake by id given url path as 'http://localhost:4200/patient-info/1/intakes/68/view' where in this case the 68 is the intake id and log it.
  }

  private loadPairedIntake(): void {
    this.intakeService.getIntakeById(this.intakeId).subscribe({
      next: intake => {
        if (!intake) {
          this.error = 'Intake not found';
          this.loading = false;
          return;
        }

        const mealPeriod = intake.meal_detail.meal_time as '午餐' | '晚餐';
        const phase = intake.meal_phase as '前' | '後';
        const intakeDate = new Date(intake.recorded_at);
        this.altImage = String(intake.image ?? '');

        console.log(intake.image)
        console.log(this.altImage)

        if (phase === '前') {
          this.beforeIntake = intake;

          console.log(this.beforeIntake)

          this.loadEstimationForIntake(intake.id).subscribe({
            next: result => {
              this.estimationBefore = result;
              this.loading = false;
            },
            error: () => {
              this.error = 'Failed to fetch or run estimation';
              this.loading = false;
            }
          });

        } else if (phase === '後') {
          this.afterIntake = intake;

          const afterEstimation$ = this.loadEstimationForIntake(intake.id);

          const beforeEstimation$ =
            this.intakeService
              .getIntakesByPatientDateAndMealPeriod(
                this.ltcpatiendid,
                mealPeriod,
                intakeDate
              )
              .pipe(
                switchMap(intakes => {
                  const beforeIntake =
                    intakes.find(i => i.meal_phase === '前');

                  if (!beforeIntake) return of(null);

                  this.beforeIntake = beforeIntake;

                  return this.loadEstimationForIntake(beforeIntake.id);
                })
              );

          forkJoin([beforeEstimation$, afterEstimation$]).subscribe({
            next: ([beforeResult, afterResult]) => {
              this.estimationBefore = beforeResult;
              this.estimationAfter = afterResult;
              this.loading = false;
            },
            error: err => {
              console.error(err);
              this.error = 'Failed to fetch or run estimation';
              this.loading = false;
            }
          });
        }

      },
      error: () => {
        this.error = 'Failed to load intake';
        this.loading = false;
      }
    });
  }

  /**
   * Load estimation for a single intake ID.
   * If no result exists, trigger pipeline run and return the new result.
   */
  private loadEstimationForIntake(intakeId: number) {
    return this.estimationService.getResultsByIntakeId(intakeId).pipe(
      switchMap(results => {
        // This only runs if GET succeeded
        if (results?.length > 0) {
          return of(results[0]);
        } else {
          return this.estimationService.runEstimation(intakeId);
        }
      }),
      catchError(err => {
        // If GET failed with 404 → trigger pipeline
        if (err.status === 404) {
          return this.estimationService.runEstimation(intakeId);
        }
        // Otherwise propagate the error
        throw err;
      })
    );
  }

  calculateIntake(): void {

    this.isCalculating = true;

    setTimeout(() => {
      this.generateIntakeData();
      this.showIntakeResults = true;
      this.isCalculating = false;
    }, 1000);
  }

  goBackToResults(): void {
      this.showIntakeResults = false;
    }

    private generateIntakeData(): void {

    const beforeTotalVolume = this.estimationBefore?.total_volume_ml || 0;
    const afterTotalVolume = this.estimationAfter?.total_volume_ml || 0;

    const volumeConsumed =
      Math.max(0, beforeTotalVolume - afterTotalVolume);

    const volumePercentage =
      beforeTotalVolume > 0
        ? Math.round((volumeConsumed / beforeTotalVolume) * 10000) / 100
        : 0;

    const itemDetails: any[] = [];

    if (this.estimationBefore) {

      const beforeMap = new Map<string, FoodItem>();
      const afterMap = new Map<string, FoodItem>();

      // Build before map
      this.estimationBefore.food_items.forEach(item => {
        beforeMap.set(item.food_class, item);
      });

      // Build after map
      if (this.estimationAfter) {
        this.estimationAfter.food_items.forEach(item => {
          afterMap.set(item.food_class, item);
        });
      }

      // Union of all food classes
      const allClasses = new Set([
        ...beforeMap.keys(),
        ...afterMap.keys()
      ]);

      allClasses.forEach(foodClass => {

        const beforeVol = beforeMap.get(foodClass)?.volume_ml || 0;
        const afterVol = afterMap.get(foodClass)?.volume_ml || 0;

        // If item disappears after → assume fully eaten
        const consumed =
          afterMap.has(foodClass)
            ? Math.max(0, beforeVol - afterVol)
            : beforeVol;

        const percentage =
          beforeVol > 0
            ? Math.round((consumed / beforeVol) * 10000) / 100
            : 0;

        itemDetails.push({
          name: foodClass,
          before: beforeVol,
          after: afterVol,
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
      afterTotalVolume: afterTotalVolume
    };

    console.log('Calculated Intake Data:', this.intakeData);
  }
}