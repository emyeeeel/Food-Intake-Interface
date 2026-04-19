import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

import { HeaderComponent } from '../../components/header/header.component';
import { AddIntakeComponent } from '../../components/add-intake/add-intake.component';
import { LTCPatient } from '../../../models/ltc-patient.model';
import { Meal } from '../../../models/meal.model';
import { PatientService } from '../../../services/patient.service';
import { MealAssignmentService } from '../../../services/meal-assignment.service';
import { MealsService } from '../../../services/meals.service';
import { DateService } from '../../../services/date.service';
import { SettingsService } from '../../../services/settings.service';

@Component({
  selector: 'app-intakes',
  imports: [MatIconModule, CommonModule, HeaderComponent, AddIntakeComponent],
  templateUrl: './intakes.component.html',
  styleUrl: './intakes.component.scss',
})
export class IntakesComponent implements OnInit {
  patients: LTCPatient[] = [];
  loading = true;
  checkingAssignment = false;

  selectedRoom: string | null = null;
  selectedBed: LTCPatient | null = null;

  assignmentDialogVisible = false;
  assignmentDialogTitle = '';
  assignmentDialogMessage = '';

  deviceId: string | null = null;

  constructor(
    private patientService: PatientService,
    private mealAssignmentService: MealAssignmentService,
    private mealsService: MealsService,
    private dateService: DateService,
    private http: HttpClient,
    public settingsService: SettingsService,
  ) {}

  ngOnInit(): void {
    this.loadLTCPatients();
    this.loadDeviceId();
  }

  private loadDeviceId(): void {
    const machineIp = this.settingsService.machineIp;
    if (!machineIp) return;
    this.http.get<{ device_id: string }>(`${machineIp}/api/device-info/`).subscribe({
      next: (res) => {
        this.deviceId = res.device_id;
        console.log('[Intakes] Device ID:', this.deviceId);
      },
      error: (err) => console.warn('[Intakes] Could not fetch device info:', err),
    });
  }

  private loadLTCPatients(): void {
    this.patientService.getLTCPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
        this.loading = false;
      },
      error: (error) => {
        console.error('[Intakes] Error fetching LTC patients:', error);
        this.loading = false;
      },
    });
  }

  getUniqueRooms(): string[] {
    return Array.from(new Set(this.patients.map((patient) => patient.room_number)));
  }

  getBedsForRoom(room: string): LTCPatient[] {
    return this.patients.filter((patient) => patient.room_number === room);
  }

  selectRoom(room: string): void {
    console.log('[Intakes] selectRoom:', room);
    this.selectedRoom = room;
    this.selectedBed = null;
    this.assignmentDialogVisible = false;
  }

  async selectBed(patient: LTCPatient): Promise<void> {
    if (this.checkingAssignment) {
      console.log('[Intakes] selectBed skipped because checking is already in progress');
      return;
    }

    console.log('[Intakes] selectBed start:', {
      patientId: patient.id,
      room: patient.room_number,
      bed: patient.bed_number,
      selectedBedBefore: this.selectedBed?.id ?? null,
    });

    this.checkingAssignment = true;
    this.selectedBed = null;
    this.assignmentDialogVisible = false;

    try {
      const currentMealPeriod = this.dateService.getCurrentMealPeriod();
      console.log('[Intakes] currentMealPeriod:', currentMealPeriod);

      if (!currentMealPeriod) {
        this.showAssignmentDialog(
          '目前不在餐期內',
          '系統目前不在午餐或晚餐拍攝時間內，請於餐期時間再操作。'
        );
        console.log('[Intakes] blocked: not in meal period');
        return;
      }

      // Mode-aware filter: cyclic matches on day_cycle, open matches on serve_date.
      // Without this branch, an open-mode system with leftover cyclic assignments
      // (e.g. post-migration patients) would falsely resolve today's meal to the
      // stale cyclic meal that happens to share today's cycle day.
      const mode = this.settingsService.menuMode;
      const today = this.dateService.getTodayDate();
      const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const todayCycleDay = this.dateService.getTodaysCycleDay().toString();
      console.log('[Intakes] mode:', mode, 'todayISO:', todayISO, 'todayCycleDay:', todayCycleDay);

      const assignments = await firstValueFrom(
        this.mealAssignmentService
          .getMealAssignmentsByLTCPatient(patient.id)
          .pipe(timeout(5000))
      );

      console.log('[Intakes] assignments raw:', assignments);

      const currentMealAssignments = (assignments ?? []).filter((assignment) => {
        const meal = assignment.meal_detail;
        if (!meal) return false; // orphan assignment (meal=NULL)

        // Must be the system's current mode — otherwise a leftover cyclic
        // assignment could satisfy an open-mode shift, or vice versa.
        const mealMode = (meal.menu_mode || 'cyclic') as 'cyclic' | 'open';
        if (mealMode !== mode) return false;

        if (meal.meal_time !== currentMealPeriod) return false;

        if (mode === 'open') {
          return meal.serve_date === todayISO;
        }
        // cyclic: match today's position in the cycle
        const assignmentDay =
          assignment.day_cycle?.toString() ??
          meal.day_cycle?.toString() ??
          '';
        return assignmentDay === todayCycleDay;
      });

      console.log('[Intakes] currentMealAssignments:', currentMealAssignments);

      if (currentMealAssignments.length === 0) {
        this.showAssignmentDialog(
          '此住民尚未指定餐點',
          `${patient.room_number}-${patient.bed_number} 目前在今天的${currentMealPeriod}沒有配餐，請先完成膳食指派。`
        );
        console.log('[Intakes] blocked: no current meal assignments');
        return;
      }

      this.selectedBed = patient;
      console.log('[Intakes] allowed: selectedBed set to', patient.id);
    } catch (error) {
      console.error('[Intakes] Error checking meal assignments:', error);
      this.showAssignmentDialog(
        '無法確認配餐狀態',
        `${patient.room_number}-${patient.bed_number} 目前無法確認配餐資料，請稍後再試。`
      );
      console.log('[Intakes] blocked: error while checking assignments');
    } finally {
      this.checkingAssignment = false;
      console.log('[Intakes] selectBed end:', {
        selectedBedAfter: this.selectedBed?.id ?? null,
        assignmentDialogVisible: this.assignmentDialogVisible,
      });
    }
  }

  backToRooms(): void {
    console.log('[Intakes] backToRooms');
    this.selectedRoom = null;
    this.selectedBed = null;
    this.checkingAssignment = false;
  }

  backToBeds(): void {
    console.log('[Intakes] backToBeds');
    this.selectedBed = null;
  }

  closeAssignmentDialog(): void {
    console.log('[Intakes] closeAssignmentDialog');
    this.assignmentDialogVisible = false;
  }

  handleIntakeCompleted(): void {
    console.log('[Intakes] handleIntakeCompleted');
    this.selectedBed = null;
    this.selectedRoom = null;
  }

  private showAssignmentDialog(title: string, message: string): void {
    this.assignmentDialogTitle = title;
    this.assignmentDialogMessage = message;
    this.assignmentDialogVisible = true;
    console.log('[Intakes] showAssignmentDialog:', { title, message });
  }

  // === 今日菜單 modal ===
  // Read-only peek at today's menu so care-center staff can glance at what's
  // being served before they scan. Mode-aware: open → serve_date=today,
  // cyclic → day_cycle=today's cycle day. Groups by 午餐 / 晚餐.

  todayMenuVisible = false;
  todayMenuLoading = false;
  todayMenuError: string | null = null;
  todayMenuDate = '';
  todayLunchMeals: Meal[] = [];
  todayDinnerMeals: Meal[] = [];

  openTodayMenu(): void {
    this.todayMenuVisible = true;
    this.todayMenuError = null;
    this.todayLunchMeals = [];
    this.todayDinnerMeals = [];

    const mode = this.settingsService.menuMode;
    const today = this.dateService.getTodayDate();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.todayMenuDate = todayISO;

    const filters: { [key: string]: string | number } = { menu_mode: mode };
    if (mode === 'open') {
      filters['serve_date'] = todayISO;
    } else {
      filters['day_cycle'] = this.dateService.getTodaysCycleDay();
    }

    this.todayMenuLoading = true;
    this.mealsService.getMealsFiltered(filters).subscribe({
      next: (meals) => {
        const active = (meals ?? []).filter(m => !m.is_archived);
        active.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
        this.todayLunchMeals = active.filter(m => m.meal_time === '午餐');
        this.todayDinnerMeals = active.filter(m => m.meal_time === '晚餐');
        this.todayMenuLoading = false;
      },
      error: (err) => {
        console.error('[Intakes] today menu fetch failed:', err);
        this.todayMenuError = '無法載入今日菜單';
        this.todayMenuLoading = false;
      },
    });
  }

  closeTodayMenu(): void {
    this.todayMenuVisible = false;
  }
}
