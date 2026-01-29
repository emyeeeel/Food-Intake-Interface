import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { LTCPatient } from '../../models/ltc-patient.model';
import { Subscription } from 'rxjs';
import { PatientService } from '../../services/patient.service';
import { IntakeService } from '../../services/intake.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IntakeRecord } from '../../models/food-intake.model';
import { CommonModule } from '@angular/common';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { DateService } from '../../services/date.service';

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
    private route: ActivatedRoute,
    private dateService: DateService
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

  public exportIntakesToExcel(): void {
    if (this.intakes.length === 0) {
      alert('No intake records to save.');
      return;
    }
  
    // Map your data into Excel-friendly format
    const excelData = this.intakes.map(intake => {
      const dayCycle = intake.meal_detail?.day_cycle ?? null;
      let formattedDate = '-';
      if (dayCycle !== null) {
        try {
          const dateObj = this.dateService.getDateForCycleDay(dayCycle);
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          formattedDate = `${yyyy}${mm}${dd}`; // yyyymmdd format
        } catch (err) {
          console.warn('Error formatting date for day cycle:', dayCycle, err);
        }
      }
  
      return {
        'Meal': intake.meal_detail?.meal_name || '-',
        'Time': intake.meal_detail?.meal_time || '-',
        'Day': dayCycle !== null ? `Day ${dayCycle}` : '-',
        'Date': formattedDate,
        'Weight (g)': intake.weight_g ?? '-',
        'Volume (ml)': intake.volume_ml ?? '-',
        'Recorded At': intake.recorded_at
          ? new Date(intake.recorded_at).toLocaleString()
          : '-',
      };
    });
  
    // Create worksheet and workbook
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'Intakes': worksheet },
      SheetNames: ['Intakes']
    };
  
    // Write workbook and save
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `${this.intakes[0].patient_identifier}-Intakes.xlsx`);
  }
  
  public getDateForDayCycle(dayCycle: number): string {
    try {
      const date = this.dateService.getDateForCycleDay(dayCycle); // Date object for that day
      // Format as yyyymmdd
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}${mm}${dd}`;
    } catch (error) {
      console.warn('Invalid day cycle:', dayCycle, error);
      return '-';
    }
  }
  
}
