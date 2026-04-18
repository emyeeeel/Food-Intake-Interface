import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IntakeService } from '../../services/intake.service';
import { IntakeRecord } from '../../models/food-intake.model';

interface PatientSummary {
  ltcPatientId: number;
  roomNumber: string;
  bedNumber: string;
  name: string;
  recordCount: number;
  latestDate: string;
  latestPhase: string;
}

@Component({
  selector: 'app-display-intake',
  imports: [CommonModule],
  templateUrl: './display-intake.component.html',
  styleUrls: ['./display-intake.component.scss']
})
export class DisplayIntakeComponent implements OnInit {
  patients: PatientSummary[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(
    private intakeService: IntakeService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadIntakes();
  }

  loadIntakes(): void {
    this.isLoading = true;
    this.error = null;

    this.intakeService.getIntakes().subscribe({
      next: (records) => {
        this.patients = this.groupByPatient(records);
        this.isLoading = false;
      },
      error: () => {
        this.error = '載入攝取紀錄失敗';
        this.isLoading = false;
      },
    });
  }

  private groupByPatient(records: IntakeRecord[]): PatientSummary[] {
    const map = new Map<number, PatientSummary>();

    for (const r of records) {
      const pid = r.ltc_patient;
      if (!pid) continue;

      const existing = map.get(pid);
      const recordDate = new Date(r.recorded_at);

      if (existing) {
        existing.recordCount++;
        if (recordDate.toISOString() > existing.latestDate) {
          existing.latestDate = recordDate.toISOString();
          existing.latestPhase = r.meal_phase || '';
        }
      } else {
        const detail = r.ltc_patient_detail;
        map.set(pid, {
          ltcPatientId: pid,
          roomNumber: detail?.room_number || '?',
          bedNumber: detail?.bed_number || '?',
          name: detail?.name || '—',
          recordCount: 1,
          latestDate: recordDate.toISOString(),
          latestPhase: r.meal_phase || '',
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      // Sort by room then bed
      const roomCmp = a.roomNumber.localeCompare(b.roomNumber);
      if (roomCmp !== 0) return roomCmp;
      return a.bedNumber.localeCompare(b.bedNumber);
    });
  }

  formatDate(isoDate: string): string {
    const d = new Date(isoDate);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  goToPatientIntakes(patientId: number): void {
    this.router.navigate(['/patient-info', patientId, 'intakes']);
  }

  refreshRecords(): void {
    this.loadIntakes();
  }
}
