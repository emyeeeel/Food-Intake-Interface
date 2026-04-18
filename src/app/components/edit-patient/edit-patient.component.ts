import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { LTCPatient } from '../../models/ltc-patient.model';
import { MealAssignment } from '../../models/meal-assignment.mode';
import { Meal } from '../../models/meal.model';
import { MealAssignmentService } from '../../services/meal-assignment.service';
import { MealsService } from '../../services/meals.service';
import { PatientService } from '../../services/patient.service';

interface MealAssignmentForm {
  dayId: string;
  lunchMeals: Meal[];
  dinnerMeals: Meal[];
  selectedLunchMeals: number[];
  selectedDinnerMeals: number[];
}

type CalendarMode = 'gregorian' | 'roc';

@Component({
  selector: 'app-edit-patient',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-patient.component.html',
  styleUrls: ['./edit-patient.component.scss']
})
export class EditPatientComponent implements OnInit, OnDestroy {
  @Input() patientId?: number;

  loading = true;
  error: string | null = null;
  successMessage = '';

  ltcPatient: LTCPatient | null = null;
  originalPatientData: LTCPatient | null = null;

  roomNumber = '';
  bedNumber = '';
  name = '';
  national_id = '';
  birthdate = '';
  birthdateDisplay = '';
  calendarMode: CalendarMode = 'gregorian';
  age: number | null = null;
  sex = '';
  height: number | null = null;
  weight: number | null = null;
  activityLevel = '';
  foodAllergies = '';

  mealAssignments: MealAssignmentForm[] = [];
  existingMealAssignments: MealAssignment[] = [];
  originalMealAssignments: MealAssignmentForm[] = [];

  readonly availableDays = Array.from({ length: 14 }, (_, index) => ({
    value: String(index + 1),
    label: `第 ${index + 1} 天`
  }));

  readonly sexOptions = [
    { value: '', label: '請選擇性別' },
    { value: 'male', label: '男' },
    { value: 'female', label: '女' }
  ];

  readonly activityLevelOptions = [
    { value: '', label: '請選擇活動量' },
    { value: 'inactive', label: '靜態活動量' },
    { value: 'low_active', label: '輕度活動量' },
    { value: 'active', label: '中等活動量' },
    { value: 'very_active', label: '高度活動量' }
  ];

  private subscriptions = new Subscription();

  constructor(
    private patientService: PatientService,
    private mealAssignmentService: MealAssignmentService,
    private mealsService: MealsService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (!this.patientId) {
      const routeSub = this.route.params.subscribe((params) => {
        if (params['id']) {
          this.patientId = +params['id'];
          this.loadPatientData();
        }
      });
      this.subscriptions.add(routeSub);
    } else {
      this.loadPatientData();
    }

    if (!this.patientId && !this.route.snapshot.params['id']) {
      this.error = '找不到病患編號。';
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get yearOptions(): { value: string; label: string }[] {
    const currentYear = new Date().getFullYear();
    const options: { value: string; label: string }[] = [];

    for (let year = currentYear; year >= 1912; year -= 1) {
      if (this.calendarMode === 'roc') {
        options.push({
          value: String(year),
          label: `民國 ${year - 1911} 年`
        });
      } else {
        options.push({
          value: String(year),
          label: `${year} 年`
        });
      }
    }

    return options;
  }

  get primaryDateExample(): string {
    const formatted = this.calendarMode === 'roc'
      ? this.getFormattedBirthdate('roc')
      : this.getFormattedBirthdate('gregorian');

    if (this.calendarMode === 'roc') {
      return `民國年輸入範例：${formatted || '89/05/15'}`;
    }

    return `西元年輸入範例：${formatted || '2000/05/15'}`;
  }

  get alternateDateExample(): string {
    const formatted = this.calendarMode === 'roc'
      ? this.getFormattedBirthdate('gregorian')
      : this.getFormattedBirthdate('roc');

    if (this.calendarMode === 'roc') {
      return `西元年對照範例：${formatted || '2000/05/15'}`;
    }

    return `民國年對照範例：${formatted || '89/05/15'}`;
  }

  loadPatientData(): void {
    if (!this.patientId) {
      return;
    }

    this.loading = true;
    this.error = null;

    const patientSub = this.patientService.getLTCPatient(this.patientId).subscribe({
      next: (patient: LTCPatient) => {
        this.ltcPatient = patient;
        this.originalPatientData = { ...patient };
        this.populateForm(patient);
        this.loadExistingMealAssignments();
      },
      error: (err) => {
        console.error('Error loading patient data:', err);
        this.error = '無法載入病患資料，請稍後再試。';
        this.loading = false;
      }
    });

    this.subscriptions.add(patientSub);
  }

  private populateForm(patient: LTCPatient): void {
    this.roomNumber = patient.room_number || '';
    this.bedNumber = patient.bed_number || '';
    this.name = patient.name || '';
    this.national_id = patient.national_id || '';
    this.birthdate = patient.birthdate || '';
    this.sex = patient.sex || '';
    this.height = patient.height_cm ?? null;
    this.weight = patient.weight_kg ?? null;
    this.activityLevel = patient.activity_level || '';
    this.foodAllergies = patient.food_allergies || '';
    this.age = patient.age ?? this.calculateAgeFromBirthdate(this.birthdate);
    this.syncDateSelectorsFromBirthdate();
  }

  onCalendarModeChange(): void {
    this.birthdateDisplay = this.formatBirthdateForMode(this.birthdate, this.calendarMode);
    this.age = this.calculateAgeFromBirthdate(this.birthdate);
  }

  onBirthdateInputChange(): void {
    this.birthdateDisplay = this.formatBirthdateForMode(this.birthdate, this.calendarMode);
    this.age = this.calculateAgeFromBirthdate(this.birthdate);
  }

  onBirthdateDisplayChange(): void {
    const normalized = this.normalizeBirthdateInput(this.birthdateDisplay);
    this.birthdateDisplay = normalized;
  }

  onBirthdateDisplayBlur(): void {
    const parsedDate = this.parseBirthdateByMode(this.birthdateDisplay, this.calendarMode);
    if (parsedDate) {
      this.birthdate = parsedDate;
      this.birthdateDisplay = this.formatBirthdateForMode(parsedDate, this.calendarMode);
      this.age = this.calculateAgeFromBirthdate(this.birthdate);
      return;
    }

    this.birthdateDisplay = this.formatBirthdateForMode(this.birthdate, this.calendarMode);
  }

  get birthdatePlaceholder(): string {
    return this.calendarMode === 'roc' ? '089/05/15' : '2000/05/15';
  }

  get birthdateMaxLength(): number {
    return this.calendarMode === 'roc' ? 10 : 10;
  }

  openNativeDatePicker(input: HTMLInputElement): void {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.focus();
  }

  private normalizeBirthdateInput(value: string): string {
    const digitsAndSlashOnly = (value || '').replace(/[^\d/]/g, '');
    const parts = digitsAndSlashOnly.split('/').slice(0, 3);
    const yearLimit = this.calendarMode === 'roc' ? 3 : 4;
    const normalizedParts = parts.map((part, index) => {
      if (index === 0) {
        return part.slice(0, yearLimit);
      }

      return part.slice(0, 2);
    });

    return normalizedParts.join('/');
  }

  private parseBirthdateByMode(value: string, mode: CalendarMode): string | null {
    const trimmed = (value || '').trim();
    const match = trimmed.match(/^(\d{3,4})\/(\d{1,2})\/(\d{1,2})$/);
    if (!match) {
      return null;
    }

    let year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);

    if (mode === 'gregorian' && match[1].length !== 4) {
      return null;
    }

    if (mode === 'roc') {
      if (match[1].length !== 3) {
        return null;
      }
      year += 1911;
    }

    return this.buildIsoDate(year, month, day);
  }

  private buildIsoDate(year: number, month: number, day: number): string | null {
    const candidate = new Date(year, month - 1, day);
    if (
      Number.isNaN(candidate.getTime()) ||
      candidate.getFullYear() !== year ||
      candidate.getMonth() !== month - 1 ||
      candidate.getDate() !== day
    ) {
      return null;
    }

    const normalizedYear = String(candidate.getFullYear()).padStart(4, '0');
    const normalizedMonth = String(candidate.getMonth() + 1).padStart(2, '0');
    const normalizedDay = String(candidate.getDate()).padStart(2, '0');
    return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
  }

  private formatBirthdateForMode(value: string, mode: CalendarMode): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');

    if (mode === 'roc') {
      const rocYear = String(parsed.getFullYear() - 1911).padStart(3, '0');
      return `${rocYear}/${month}/${day}`;
    }

    return `${parsed.getFullYear()}/${month}/${day}`;
  }

  private getFormattedBirthdate(mode: CalendarMode): string {
    if (!this.birthdate) {
      return '';
    }

    const parsed = new Date(this.birthdate);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');

    if (mode === 'roc') {
      return `${parsed.getFullYear() - 1911}/${month}/${day}`;
    }

    return `${parsed.getFullYear()}/${month}/${day}`;
  }

  private syncDateSelectorsFromBirthdate(): void {
    this.birthdateDisplay = this.formatBirthdateForMode(this.birthdate, this.calendarMode);
    this.age = this.calculateAgeFromBirthdate(this.birthdate);
  }

  private calculateAgeFromBirthdate(birthdate: string): number | null {
    if (!birthdate) {
      return null;
    }

    const parsed = new Date(birthdate);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - parsed.getFullYear();
    const hadBirthdayThisYear =
      today.getMonth() > parsed.getMonth() ||
      (today.getMonth() === parsed.getMonth() && today.getDate() >= parsed.getDate());

    if (!hadBirthdayThisYear) {
      age -= 1;
    }

    return age >= 0 ? age : null;
  }

  private loadExistingMealAssignments(): void {
    if (!this.patientId) {
      return;
    }

    const assignmentsSub = this.mealAssignmentService.getMealAssignmentsByLTCPatient(this.patientId).subscribe({
      next: (assignments: MealAssignment[]) => {
        this.existingMealAssignments = assignments;
        this.populateMealAssignments(assignments);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading meal assignments:', err);
        this.initializeEmptyMealAssignment();
        this.loading = false;
      }
    });

    this.subscriptions.add(assignmentsSub);
  }

  private normalizeMealType(value: string): string {
    if (['午餐', '午飯', 'lunch'].includes(value)) {
      return '午餐';
    }

    if (['晚餐', '晚飯', 'dinner'].includes(value)) {
      return '晚餐';
    }

    return value;
  }

  private populateMealAssignments(assignments: MealAssignment[]): void {
    const assignmentsByDay: { [key: string]: MealAssignment[] } = {};

    assignments.forEach((assignment) => {
      const day = assignment.day_cycle;
      if (!assignmentsByDay[day]) {
        assignmentsByDay[day] = [];
      }
      assignmentsByDay[day].push(assignment);
    });

    this.mealAssignments = [];

    Object.keys(assignmentsByDay).forEach((day) => {
      const dayAssignments = assignmentsByDay[day];
      const lunchMeals: number[] = [];
      const dinnerMeals: number[] = [];

      dayAssignments.forEach((assignment) => {
        const mealType = this.normalizeMealType(assignment.meal_type);
        if (mealType === '午餐') {
          lunchMeals.push(assignment.meal);
        } else if (mealType === '晚餐') {
          dinnerMeals.push(assignment.meal);
        }
      });

      const assignmentForm: MealAssignmentForm = {
        dayId: day,
        lunchMeals: [],
        dinnerMeals: [],
        selectedLunchMeals: lunchMeals,
        selectedDinnerMeals: dinnerMeals
      };

      this.mealAssignments.push(assignmentForm);
      this.loadMealsForDay(day, this.mealAssignments.length - 1);
    });

    this.originalMealAssignments = JSON.parse(JSON.stringify(this.mealAssignments));

    if (this.mealAssignments.length === 0) {
      this.initializeEmptyMealAssignment();
    }
  }

  private initializeEmptyMealAssignment(): void {
    this.mealAssignments = [{
      dayId: '',
      lunchMeals: [],
      dinnerMeals: [],
      selectedLunchMeals: [],
      selectedDinnerMeals: []
    }];
  }

  private loadMealsForDay(dayId: string, assignmentIndex: number): void {
    const mealsSub = this.mealsService.getMealsForDay(+dayId).subscribe({
      next: (mealsData: { lunch: Meal[]; dinner: Meal[] }) => {
        const assignment = this.mealAssignments[assignmentIndex];
        if (assignment) {
          assignment.lunchMeals = mealsData.lunch;
          assignment.dinnerMeals = mealsData.dinner;
        }
      },
      error: (err) => {
        console.error(`Error loading meals for day ${dayId}:`, err);
      }
    });

    this.subscriptions.add(mealsSub);
  }

  addMealAssignment(): void {
    if (this.mealAssignments.length >= this.availableDays.length) {
      return;
    }

    const nextDayId = String(this.mealAssignments.length + 1);
    const newIndex = this.mealAssignments.length;

    this.mealAssignments.push({
      dayId: nextDayId,
      lunchMeals: [],
      dinnerMeals: [],
      selectedLunchMeals: [],
      selectedDinnerMeals: []
    });

    this.loadMealsForDay(nextDayId, newIndex);
  }

  removeMealAssignment(index: number): void {
    if (this.mealAssignments.length > 1) {
      this.mealAssignments.splice(index, 1);
    }
  }

  onMealSelection(mealType: 'lunch' | 'dinner', meal: Meal, event: Event, assignmentIndex: number): void {
    const assignment = this.mealAssignments[assignmentIndex];
    if (!assignment) {
      return;
    }

    const selectedArray = mealType === 'lunch' ? assignment.selectedLunchMeals : assignment.selectedDinnerMeals;
    const checked = (event.target as HTMLInputElement).checked;

    if (checked && !selectedArray.includes(meal.id)) {
      selectedArray.push(meal.id);
    }

    if (!checked) {
      const index = selectedArray.indexOf(meal.id);
      if (index > -1) {
        selectedArray.splice(index, 1);
      }
    }
  }

  trackByAssignment(index: number, assignment: MealAssignmentForm): string {
    return `${index}-${assignment.dayId}`;
  }

  updatePatient(): void {
    if (!this.isFormValid() || !this.patientId) {
      return;
    }

    this.loading = true;
    this.error = null;

    const updatedPatient: LTCPatient = {
      id: this.patientId,
      room_number: this.roomNumber,
      bed_number: this.bedNumber,
      name: this.name.trim() || null,
      national_id: this.national_id.trim() || null,
      birthdate: this.birthdate || null,
      age: this.age ?? null,
      sex: this.sex,
      height_cm: this.height ?? null,
      weight_kg: this.weight ?? null,
      activity_level: this.activityLevel,
      food_allergies: this.foodAllergies.trim() || null
    };

    const updateSub = this.patientService.updateLTCPatient(this.patientId, updatedPatient).subscribe({
      next: () => {
        this.updateMealAssignmentsSmartly();
        this.showSuccessMessage('病患資料已更新。');
      },
      error: (err) => {
        console.error('Error updating patient:', err);
        this.error = '更新病患資料失敗，請稍後再試。';
        this.loading = false;
      }
    });

    this.subscriptions.add(updateSub);
  }

  private processMealAssignments(): any[] {
    if (!this.patientId) {
      return [];
    }

    return this.mealAssignments.flatMap((assignment) => {
      if (!assignment.dayId) {
        return [];
      }

      const lunchAssignments = assignment.selectedLunchMeals.map((mealId) => ({
        meal: mealId,
        day_cycle: assignment.dayId,
        meal_type: '午餐',
        ltc_patient: this.patientId
      }));

      const dinnerAssignments = assignment.selectedDinnerMeals.map((mealId) => ({
        meal: mealId,
        day_cycle: assignment.dayId,
        meal_type: '晚餐',
        ltc_patient: this.patientId
      }));

      return [...lunchAssignments, ...dinnerAssignments];
    });
  }

  private compareMealAssignments(existing: MealAssignment[], nextAssignments: any[]) {
    const toDelete: MealAssignment[] = [];
    const toCreate: any[] = [];

    const existingMap = new Map<string, MealAssignment>();
    existing.forEach((assignment) => {
      const key = `${assignment.meal}-${assignment.day_cycle}-${this.normalizeMealType(assignment.meal_type)}`;
      existingMap.set(key, assignment);
    });

    const nextMap = new Map<string, any>();
    nextAssignments.forEach((assignment) => {
      const key = `${assignment.meal}-${assignment.day_cycle}-${assignment.meal_type}`;
      nextMap.set(key, assignment);
    });

    existingMap.forEach((assignment, key) => {
      if (!nextMap.has(key)) {
        toDelete.push(assignment);
      }
    });

    nextMap.forEach((assignment, key) => {
      if (!existingMap.has(key)) {
        toCreate.push(assignment);
      }
    });

    return { toDelete, toCreate };
  }

  private executeSmartMealAssignmentUpdates(changes: { toDelete: MealAssignment[]; toCreate: any[] }) {
    const operations = [];

    if (changes.toDelete.length > 0) {
      const deleteOps = changes.toDelete.map((assignment) =>
        this.mealAssignmentService.deleteMealAssignment(assignment.id).pipe(
          catchError((error) => {
            console.error(`Error deleting meal assignment ${assignment.id}:`, error);
            return of(null);
          })
        )
      );
      operations.push(...deleteOps);
    }

    if (changes.toCreate.length > 0) {
      const createOps = changes.toCreate.map((assignment) =>
        this.mealAssignmentService.createMealAssignment(assignment).pipe(
          catchError((error) => {
            console.error('Error creating meal assignment:', error);
            return of(null);
          })
        )
      );
      operations.push(...createOps);
    }

    if (operations.length === 0) {
      return of([]);
    }

    return forkJoin(operations);
  }

  private updateMealAssignmentsSmartly(): void {
    if (!this.patientId) {
      this.completeUpdate();
      return;
    }

    const currentAssignments = this.processMealAssignments();
    const changes = this.compareMealAssignments(this.existingMealAssignments, currentAssignments);

    if (changes.toDelete.length === 0 && changes.toCreate.length === 0) {
      this.completeUpdate();
      return;
    }

    this.executeSmartMealAssignmentUpdates(changes).subscribe({
      next: () => this.completeUpdate(),
      error: (error) => {
        console.error('Error in smart meal assignment update:', error);
        this.error = '病患資料已更新，但餐點分配同步失敗。';
        this.completeUpdate();
      }
    });
  }

  private completeUpdate(): void {
    this.loading = false;

    if (!this.error) {
      this.router.navigate(['/patient-info']);
    }
  }

  resetForm(): void {
    if (this.originalPatientData) {
      this.populateForm(this.originalPatientData);
    }

    if (this.originalMealAssignments.length > 0) {
      this.mealAssignments = JSON.parse(JSON.stringify(this.originalMealAssignments));
    } else {
      this.initializeEmptyMealAssignment();
    }
  }

  cancelEdit(): void {
    this.router.navigate(['/patient-info']);
  }

  isFormValid(): boolean {
    return !!(this.roomNumber && this.bedNumber);
  }

  clearSuccessMessage(): void {
    this.successMessage = '';
  }

  showSuccessMessage(message: string): void {
    this.successMessage = message;
    setTimeout(() => this.clearSuccessMessage(), 5000);
  }
}
