import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';

import { PatientService } from '../../services/patient.service';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { DateService } from '../../services/date.service';
import { SettingsService } from '../../services/settings.service';
import { LTCPatient } from '../../models/ltc-patient.model';
import { Meal } from '../../models/meal.model';
import { MealAssignment } from '../../models/meal-assignment.mode';
import { toISODate, getSlotKey } from '../../utils/meal.utils';

interface WeekDay {
  label: string;
  key: string;       // Matches getSlotKey format: 'cyclic:d1' or 'open:2026-04-19'
  date: Date;
  isToday: boolean;
}

/**
 * Weekly meal-assignment overview for all LTC patients.
 *
 * Purpose: at a glance, who's assigned to what meal this week. Lets the
 * care-center staff spot unassigned residents before the cook cart rolls.
 *
 * Layout: patient rows × 14 columns (7 days × {午餐, 晚餐}).
 * Mode-aware:
 *   - cyclic: columns are fixed day_cycle 1..7 (with the calendar dates
 *     they currently map to, shown as labels). No week navigation needed
 *     since the cycle repeats.
 *   - open: columns are 7 consecutive calendar dates; prev/next/today
 *     buttons shift the visible week.
 */
@Component({
  selector: 'app-assignments-week',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './assignments-week.component.html',
  styleUrl: './assignments-week.component.scss',
})
export class AssignmentsWeekComponent implements OnInit {
  loading = true;
  loadError: string | null = null;

  menuMode: 'cyclic' | 'open' = 'cyclic';
  patients: LTCPatient[] = [];
  roomFilter = '';

  readonly MEAL_TIMES = ['午餐', '晚餐'];
  readonly WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

  /** Start of the displayed week (local time, 00:00). Only meaningful in open mode. */
  weekStartDate: Date;

  /** Map key `${ltc_patient_id}::${slotKey}::${meal_time}` → assigned meals. */
  matrix = new Map<string, Meal[]>();

  /** Cell open in the detail popover, or null. */
  popoverCellKey: string | null = null;

  constructor(
    private router: Router,
    private patientService: PatientService,
    private mealAssignmentService: MealAssignmentService,
    private dateService: DateService,
    private settingsService: SettingsService,
  ) {
    this.weekStartDate = this.computeCurrentWeekStart();
  }

  ngOnInit(): void {
    this.menuMode = this.settingsService.menuMode;
    this.loadAll();
  }

  private computeCurrentWeekStart(): Date {
    const today = new Date();
    // Monday-based week: dayOfWeek 0=Sun, 1=Mon .. 6=Sat
    const dow = today.getDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    const start = new Date(today);
    start.setDate(today.getDate() + offset);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private toISO(d: Date): string {
    return toISODate(d);
  }

  loadAll(): void {
    this.loading = true;
    this.loadError = null;

    forkJoin({
      patients: this.patientService.getLTCPatients(),
      assignments: this.fetchAssignmentsForVisibleWeek(),
    }).subscribe({
      next: ({ patients, assignments }) => {
        this.patients = (patients ?? []).sort((a, b) => {
          const r = (a.room_number || '').localeCompare(b.room_number || '');
          if (r !== 0) return r;
          return (a.bed_number || '').localeCompare(b.bed_number || '');
        });
        this.matrix = this.buildMatrix(assignments);
        this.loading = false;
      },
      error: (err) => {
        console.error('[AssignmentsWeek] load failed:', err);
        this.loadError = '資料載入失敗，請重試。';
        this.loading = false;
      },
    });
  }

  refresh(): void {
    this.loadAll();
  }

  private fetchAssignmentsForVisibleWeek(): Observable<MealAssignment[]> {
    if (this.menuMode === 'cyclic') {
      // Cyclic slots have serve_date=null. Use serve_date_isnull so Rule C
      // reused meals (which keep menu_mode='cyclic' but have serve_date set)
      // don't bleed into the cyclic view.
      return this.mealAssignmentService.getMealAssignmentsWithRawFilters({
        menu_mode: 'cyclic',
        serve_date_isnull: 'true',
      });
    }
    const start = this.toISO(this.weekStartDate);
    const endDate = new Date(this.weekStartDate);
    endDate.setDate(endDate.getDate() + 6);
    const end = this.toISO(endDate);
    return this.mealAssignmentService.getMealAssignmentsWithRawFilters({
      serve_date_from: start,
      serve_date_to: end,
    });
  }

  private buildMatrix(assignments: MealAssignment[]): Map<string, Meal[]> {
    const m = new Map<string, Meal[]>();
    for (const a of assignments ?? []) {
      const meal = a.meal_detail;
      if (!meal) continue;
      const patientId = a.ltc_patient;
      if (patientId == null) continue;
      // Build the slot key from the assignment's own serve_date when present.
      // getSlotKey format: 'open:YYYY-MM-DD' or 'cyclic:dN'.
      // Rule C may reuse Meal rows with menu_mode='cyclic', so the meal's
      // mode field can't be trusted — use the assignment's serve_date instead.
      const slotKey = a.serve_date
        ? getSlotKey({ menu_mode: 'open', serve_date: a.serve_date, day_cycle: null })
        : getSlotKey(meal);
      if (!slotKey) continue;
      const fullKey = `${patientId}::${slotKey}::${meal.meal_time}`;
      if (!m.has(fullKey)) m.set(fullKey, []);
      m.get(fullKey)!.push(meal as Meal);
    }
    // Stable-ish order within each cell: lowest meal id first
    for (const list of m.values()) {
      list.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    }
    return m;
  }

  // === Visible week days ===

  get weekDays(): WeekDay[] {
    const todayISO = this.toISO(new Date());

    if (this.menuMode === 'cyclic') {
      // Columns are day_cycle 1..7. Map to calendar dates using current cycle.
      return Array.from({ length: 7 }, (_, i) => {
        const dc = i + 1;
        const date = this.dateService.getDateForCycleDay(dc);
        const iso = this.toISO(date);
        return {
          label: `第 ${dc} 天 · ${date.getMonth() + 1}/${date.getDate()} (週${this.WEEKDAY_LABELS[date.getDay()]})`,
          key: getSlotKey({ menu_mode: 'cyclic', day_cycle: dc, serve_date: null }),
          date,
          isToday: iso === todayISO,
        };
      });
    }

    // open: 7 consecutive dates from weekStartDate
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.weekStartDate);
      d.setDate(d.getDate() + i);
      const iso = this.toISO(d);
      return {
        label: `${d.getMonth() + 1}/${d.getDate()} (週${this.WEEKDAY_LABELS[d.getDay()]})`,
        key: getSlotKey({ menu_mode: 'open', day_cycle: null, serve_date: iso }),
        date: d,
        isToday: iso === todayISO,
      };
    });
  }

  get weekRangeLabel(): string {
    if (this.menuMode === 'cyclic') return '循環菜單（day 1 – day 7）';
    const end = new Date(this.weekStartDate);
    end.setDate(end.getDate() + 6);
    return `${this.toISO(this.weekStartDate)} ～ ${this.toISO(end)}`;
  }

  prevWeek(): void {
    if (this.menuMode === 'cyclic') return;
    this.shiftWeek(-7);
  }

  nextWeek(): void {
    if (this.menuMode === 'cyclic') return;
    this.shiftWeek(7);
  }

  jumpToThisWeek(): void {
    if (this.menuMode === 'cyclic') return;
    this.weekStartDate = this.computeCurrentWeekStart();
    this.loadAll();
  }

  private shiftWeek(deltaDays: number): void {
    const d = new Date(this.weekStartDate);
    d.setDate(d.getDate() + deltaDays);
    this.weekStartDate = d;
    this.loadAll();
  }

  // === Room filter + stats ===

  get roomOptions(): string[] {
    const rooms = new Set<string>();
    for (const p of this.patients) if (p.room_number) rooms.add(p.room_number);
    return Array.from(rooms).sort();
  }

  get filteredPatients(): LTCPatient[] {
    if (!this.roomFilter) return this.patients;
    return this.patients.filter(p => p.room_number === this.roomFilter);
  }

  get totalSlots(): number {
    return this.filteredPatients.length * 7 * this.MEAL_TIMES.length;
  }

  get filledSlots(): number {
    let n = 0;
    for (const p of this.filteredPatients) {
      for (const d of this.weekDays) {
        for (const mt of this.MEAL_TIMES) {
          if (this.cellMeals(p, d, mt).length > 0) n++;
        }
      }
    }
    return n;
  }

  get missingSlots(): number {
    return Math.max(0, this.totalSlots - this.filledSlots);
  }

  // === Cell helpers ===

  cellMeals(patient: LTCPatient, day: WeekDay, mealTime: string): Meal[] {
    const fullKey = `${patient.id}::${day.key}::${mealTime}`;
    return this.matrix.get(fullKey) ?? [];
  }

  cellKey(patient: LTCPatient, day: WeekDay, mealTime: string): string {
    return `${patient.id}::${day.key}::${mealTime}`;
  }

  openCellPopover(patient: LTCPatient, day: WeekDay, mealTime: string, event: Event): void {
    event.stopPropagation();
    const key = this.cellKey(patient, day, mealTime);
    this.popoverCellKey = this.popoverCellKey === key ? null : key;
  }

  closePopover(): void {
    this.popoverCellKey = null;
  }

  patientLabel(p: LTCPatient): string {
    const nameBit = p.name ? ` ${p.name}` : '';
    return `${p.room_number}-${p.bed_number}${nameBit}`;
  }

  goBack(): void {
    this.router.navigate(['/meal-catalog']);
  }
}
