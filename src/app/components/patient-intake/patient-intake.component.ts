import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { LTCPatient } from '../../models/ltc-patient.model';
import { Subscription } from 'rxjs';
import { PatientService } from '../../services/patient.service';
import { IntakeService } from '../../services/intake.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IntakeRecord } from '../../models/food-intake.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-patient-intake',
  imports: [CommonModule],
  templateUrl: './patient-intake.component.html',
  styleUrl: './patient-intake.component.scss',
})
export class PatientIntakeComponent implements OnInit, OnChanges, OnDestroy {
  @Input() patientId: number = 0;

  ltcPatient: LTCPatient | null = null;
  intakes: IntakeRecord[] = [];
  loading: boolean = true;
  error: string | null = null;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private intakeService: IntakeService,
    private patientService: PatientService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    if (!this.patientId) {
      const routePatientId = this.route.snapshot.paramMap.get('id');
      if (routePatientId) {
        this.patientId = parseInt(routePatientId, 10);
      }
    }

    if (this.patientId) {
      this.loadPatientFoodIntake(this.patientId);
    } else {
      this.error = 'Patient ID is required';
      this.loading = false;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['patientId'] && changes['patientId'].currentValue) {
      this.loadPatientFoodIntake(changes['patientId'].currentValue);
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  public loadPatientFoodIntake(patientId: number): void {
    this.loading = true;
    this.error = null;

    const patientSub = this.patientService.getLTCPatient(patientId).subscribe({
      next: (ltcPatientData) => {
        this.ltcPatient = ltcPatientData;

        const mealsSub = this.intakeService
          .getIntakeByLtcPatientId(patientId)
          .subscribe({
            next: (data) => {
              this.intakes = data;
              this.loading = false;
            },
            error: () => {
              this.error = 'Failed to load food intake records.';
              this.loading = false;
            }
          });

        this.subscriptions.add(mealsSub);
      },
      error: () => {
        this.error = 'Failed to load patient.';
        this.loading = false;
      }
    });

    this.subscriptions.add(patientSub);
  }

}
