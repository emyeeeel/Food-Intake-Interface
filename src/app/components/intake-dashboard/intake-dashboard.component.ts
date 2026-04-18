import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, Subscription, interval } from 'rxjs';
import { IntakeService } from '../../services/intake.service';
import { PatientService } from '../../services/patient.service';
import { DateService } from '../../services/date.service';
import { IntakeRecord } from '../../models/food-intake.model';
import { LTCPatient } from '../../models/ltc-patient.model';

interface RecentUpload {
  patientId: number;
  room: string;
  bed: string;
  name: string;
  phase: string;
  mealTime: string;
  time: string;
  deviceId: string;
}

interface MissingPatient {
  id: number;
  room: string;
  bed: string;
  name: string;
}

@Component({
  selector: 'app-intake-dashboard',
  imports: [CommonModule],
  templateUrl: './intake-dashboard.component.html',
  styleUrl: './intake-dashboard.component.scss',
})
export class IntakeDashboardComponent implements OnInit, OnDestroy {
  @Input() searchQuery = '';

  // Stats
  totalPatients = 0;
  completedPatients = 0;
  progressPercent = 0;
  currentMealPeriod = '';
  todayLabel = '';
  cycleDay = 0;
  menuMode: 'cyclic' | 'open' = 'cyclic';

  // Data (unfiltered)
  allRecentUploads: RecentUpload[] = [];
  allMissingPatients: MissingPatient[] = [];

  showMissing = false;
  isLoading = true;
  private refreshSub?: Subscription;

  constructor(
    private intakeService: IntakeService,
    private patientService: PatientService,
    private dateService: DateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
    this.refreshSub = interval(30000).subscribe(() => this.loadDashboard());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  // Filtered getters — react to searchQuery changes without re-fetching
  get recentUploads(): RecentUpload[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.allRecentUploads;
    return this.allRecentUploads.filter(u =>
      u.name.toLowerCase().includes(q) ||
      `${u.room}-${u.bed}`.includes(q) ||
      u.room.includes(q)
    );
  }

  get missingPatients(): MissingPatient[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.allMissingPatients;
    return this.allMissingPatients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      `${p.room}-${p.bed}`.includes(q) ||
      p.room.includes(q)
    );
  }

  loadDashboard(): void {
    const today = new Date();
    this.todayLabel = `${today.getMonth() + 1}/${today.getDate()}`;
    this.menuMode = this.dateService.getCurrentMenuMode();
    this.cycleDay = this.menuMode === 'cyclic' ? this.dateService.getTodaysCycleDay() : 0;

    const period = this.dateService.getCurrentMealPeriod();
    this.currentMealPeriod = period === 0 ? '非用餐時段' : period;

    forkJoin({
      intakes: this.intakeService.getIntakes(),
      patients: this.patientService.getLTCPatients(),
    }).subscribe({
      next: ({ intakes, patients }) => {
        this.totalPatients = patients.length;
        this.processData(intakes, patients, today);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  private processData(intakes: IntakeRecord[], patients: LTCPatient[], today: Date): void {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayIntakes = intakes.filter(r => r.recorded_at.startsWith(todayStr));

    const patientIdsWithIntake = new Set(todayIntakes.map(r => r.ltc_patient));
    this.completedPatients = patientIdsWithIntake.size;
    this.progressPercent = this.totalPatients > 0
      ? Math.round((this.completedPatients / this.totalPatients) * 100)
      : 0;

    // Recent uploads (latest 5)
    const sorted = [...todayIntakes].sort(
      (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );
    this.allRecentUploads = sorted.slice(0, 5).map(r => {
      const d = new Date(r.recorded_at);
      const detail = r.ltc_patient_detail;
      return {
        patientId: r.ltc_patient,
        room: detail?.room_number || '?',
        bed: detail?.bed_number || '?',
        name: detail?.name || '—',
        phase: r.meal_phase || '',
        mealTime: r.meal_detail?.meal_time || '',
        time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        deviceId: (r as any).device_id || '',
      };
    });

    // Missing patients
    this.allMissingPatients = patients
      .filter(p => !patientIdsWithIntake.has(p.id))
      .sort((a, b) => {
        const r = a.room_number.localeCompare(b.room_number);
        return r !== 0 ? r : a.bed_number.localeCompare(b.bed_number);
      })
      .map(p => ({
        id: p.id,
        room: p.room_number,
        bed: p.bed_number,
        name: p.name || '—',
      }));
  }

  toggleMissing(): void {
    this.showMissing = !this.showMissing;
  }

  goToPatient(patientId: number): void {
    this.router.navigate(['/patient-info', patientId, 'intakes']);
  }
}
