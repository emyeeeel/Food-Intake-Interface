import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnInit,
  Input,
  OnChanges,
  ChangeDetectorRef,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { ActivatedRoute } from '@angular/router';
import { PatientService } from '../../services/patient.service';
import { LTCPatient } from '../../models/ltc-patient.model';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RecommenderService } from '../../services/recommender.service';
import { DateService } from '../../services/date.service';
import { PatientNutritionDailyTableComponent } from '../patient-nutrition-daily-table/patient-nutrition-daily-table.component';
import { PatientNutritionWeeklyTableComponent } from '../patient-nutrition-weekly-table/patient-nutrition-weekly-table.component';
import { PatientNutritionMonthlyTableComponent } from '../patient-nutrition-monthly-table/patient-nutrition-monthly-table.component';
import { PatientNutritionTrendChartComponent } from '../patient-nutrition-trend-chart/patient-nutrition-trend-chart.component';
import { AlternativeMealsComponent } from '../alternative-meals/alternative-meals.component';

Chart.register(...registerables, annotationPlugin);

@Component({
  selector: 'app-patient-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, PatientNutritionDailyTableComponent, PatientNutritionWeeklyTableComponent, PatientNutritionMonthlyTableComponent, AlternativeMealsComponent],
  templateUrl: './patient-analysis.component.html',
  styleUrls: ['./patient-analysis.component.scss'],
})
export class PatientAnalysisComponent implements OnDestroy, OnInit, OnChanges{
  @Input() patientId!: number; // 接收父组件传入的 patientId

  selectedPeriod: 'daily' | 'weekly' | 'monthly' = 'daily';

  private routeSub!: Subscription;

  ltcPatient?: LTCPatient;
  ltcPatientId!: number;

  recommendationText: string = '';
  recommendationData: any | null = null;
  recommendationLoading: boolean = false;
  recommendationError: string | null = null;

  clinicalNotesText: string = '';
  clinicalNotesLoading: boolean = false;
  clinicalNotesError: string | null = null;

  private cache: Partial<Record<'daily' | 'weekly' | 'monthly', any>> = {};
  private clinicalNotesCache: Partial<Record<'daily' | 'weekly' | 'monthly', string>> = {};

  patient?: any;
  date?: string;
  selectedDate?: any;

  constructor(
    private route: ActivatedRoute,
    private patientService: PatientService,
    private recommenderService: RecommenderService,
    private cdr: ChangeDetectorRef,
    private dateService: DateService
  ) { }

  // 🔥 Listen to route changes
  ngOnInit(): void {
    // if (this.patientId) {
    //   this.ltcPatientId = this.patientId;
    //   this.loadPatientData();

    //   console.log('Received patientId from parent:', this.patientId);
    // }
    console.log('Received patientId from parent:', this.patientId);

    this.dateService.selectedDate$.subscribe((date: Date) => {
      this.selectedDate = this.formatDateToYYYYMMDD(date);
      console.log('Selected Date (formatted):', this.selectedDate);
    });

    this.loadRecommendation(this.selectedPeriod);
    this.loadClinicalNotes(this.selectedPeriod);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // if (changes['patientId'] && changes['patientId'].currentValue) {
    //   this.ltcPatientId = changes['patientId'].currentValue;
    //   this.loadPatientData();
    // }
  }

  loadPatientData(): void {
    this.patientService.getLTCPatient(this.ltcPatientId).subscribe(patient => {
      this.ltcPatient = patient;

      this.cdr.detectChanges();
    });
  }

  // ================================
  // RECOMMENDATION
  // ================================
  private getRequest$(period: 'daily' | 'weekly' | 'monthly') {
    switch (period) {
      case 'daily':
        return this.recommenderService.getDailyNutritionAndFoodRecommendations(this.patientId);
      case 'weekly':
        return this.recommenderService.getWeeklyNutritionAndFoodRecommendations(this.patientId);
      case 'monthly':
        return this.recommenderService.getMonthlyNutritionAndFoodRecommendations(this.patientId);
    }
  }

  private applyResponse(period: 'daily' | 'weekly' | 'monthly', response: any): void {
    this.recommendationData = response;
    this.recommendationText = response.response ?? JSON.stringify(response, null, 2);

    if (period === 'daily') {
      this.patient = response.patient;
      this.date = this.formatDate(response.date);
    } else {
      this.date = this.formatDateRange(response.dates_list);
    }
  }

  loadRecommendation(period: 'daily' | 'weekly' | 'monthly'): void {
    if (this.cache[period]) {
      this.applyResponse(period, this.cache[period]);
      this.cdr.detectChanges();
      return;
    }

    this.recommendationLoading = true;
    this.recommendationError = null;
    this.recommendationText = '';

    this.getRequest$(period).subscribe({
      next: (response) => {
        this.cache[period] = response;
        this.applyResponse(period, response);
        this.recommendationLoading = false;
        this.cdr.detectChanges();

        if (period === 'daily') {
          this.prefetchInBackground();
        }
      },
      error: (err) => {
        console.error('Recommendation error:', err);
        this.recommendationError = 'Unable to load dietary recommendations';
        this.recommendationLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private prefetchInBackground(): void {
    (['weekly', 'monthly'] as const).forEach(period => {
      if (this.cache[period]) return;
      this.getRequest$(period).subscribe({
        next: (response) => { this.cache[period] = response; },
        error: () => { /* silent — user will retry on tab switch */ }
      });
    });
  }

  // ================================
  // CLINICAL NOTES
  // ================================
  loadClinicalNotes(period: 'daily' | 'weekly' | 'monthly'): void {
    if (this.clinicalNotesCache[period]) {
      this.clinicalNotesText = this.clinicalNotesCache[period]!;
      this.clinicalNotesError = null;
      this.cdr.detectChanges();
      return;
    }

    this.clinicalNotesLoading = true;
    this.clinicalNotesError = null;
    this.clinicalNotesText = '';

    const request$ = period === 'daily'
      ? this.recommenderService.getDailyKnnJustified(this.patientId)
      : period === 'weekly'
        ? this.recommenderService.getWeeklyKnnJustified(this.patientId)
        : this.recommenderService.getMonthlyKnnJustified(this.patientId);

    request$.subscribe({
      next: (response) => {
        const text = response?.response ?? response?.notes ?? JSON.stringify(response, null, 2);
        this.clinicalNotesCache[period] = text;
        this.clinicalNotesText = text;
        this.clinicalNotesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.clinicalNotesError = 'Unable to load clinical notes';
        this.clinicalNotesLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ================================
  // UPDATE
  // ================================
  onPeriodChange(period: 'daily' | 'weekly' | 'monthly'): void {
    this.selectedPeriod = period;
    this.loadRecommendation(period);
    this.loadClinicalNotes(period);
  }


  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  onPatientIdChange(newPatientId: number): void {
    this.patientId = newPatientId;
  }

  formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatDateRange(dates: string[]): string {
    const sorted = [...dates].sort((a, b) =>
      new Date(a).getTime() - new Date(b).getTime()
    );

    const start = new Date(sorted[0]);
    const end = new Date(sorted[sorted.length - 1]);

    const startStr = start.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });

    const endStr = end.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    return `${startStr} – ${endStr}`;
  }

//   @ViewChild('lineChart') lineChartRef!: ElementRef<HTMLCanvasElement>;
//   @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;

//   selectedPeriod: 'daily' | 'weekly' | 'monthly' = 'weekly';

//   readonly Y_MAX = {
//   daily: 100,
//   weekly: 250,
//   monthly: 500
// };

//   private lineChart!: Chart;
//   private barChart!: Chart;
//   private routeSub!: Subscription;

//   ltcPatient?: LTCPatient;
//   ltcPatientId!: number;

//   recommendationText: string = '';
//   recommendationLoading: boolean = false;
//   recommendationError: string | null = null;

//   constructor(
//     private route: ActivatedRoute,
//     private patientService: PatientService,
//     private recommenderService: RecommenderService
//   ) {}

//   // 🔥 Listen to route changes
//   ngOnInit(): void {
//     this.routeSub = this.route.paramMap.subscribe(params => {
//       this.ltcPatientId = Number(params.get('id'));
//       this.loadPatientData();
//     });
//   }

//   // 🔥 Create charts ONCE
//   ngAfterViewInit(): void {
//     this.createLineChart();
//     this.createBarChart();
//   }

//   loadPatientData(): void {
//     this.patientService.getLTCPatient(this.ltcPatientId).subscribe(patient => {
//       this.ltcPatient = patient;
//       this.onPeriodChange('daily');
//     });
//   }

//   loadRecommendation(period: 'daily' | 'weekly' | 'monthly'): void {
//     this.recommendationLoading = true;
//     this.recommendationError = null;
//     this.recommendationText = '';

//     let request$;

//     switch (period) {
//       case 'daily':
//         request$ = this.recommenderService.getDailyRecommendations(this.ltcPatientId);
//         break;
//       case 'weekly':
//         request$ = this.recommenderService.getWeeklyRecommendations(this.ltcPatientId);
//         break;
//       case 'monthly':
//         // no monthly endpoint — fall back to general nutrients
//         request$ = this.recommenderService.getGeneralNutrientRecommendations(this.ltcPatientId);
//         break;
//     }

//     request$.subscribe({
//       next: (response) => {
//         this.recommendationText = response['response'] ?? JSON.stringify(response, null, 2);
//         this.recommendationLoading = false;
//       },
//       error: (err) => {
//         console.error('Recommendation error:', err);
//         this.recommendationError = '無法載入飲食建議';
//         this.recommendationLoading = false;
//       }
//     });
//   }

//   // ================================
//   // CHART CREATION (EMPTY INIT)
//   // ================================

//   createLineChart(): void {
//     this.lineChart = new Chart(this.lineChartRef.nativeElement, {
//       type: 'line',
//       data: {
//         labels: [],
//         datasets: [{
//           data: [],
//           borderColor: '#40C1AC',
//           backgroundColor: 'rgba(64,193,172,0.15)',
//           fill: true,
//           tension: 0.4,
//           borderWidth: 3
//         }]
//       },
//       options: {
//         responsive: true,
//         maintainAspectRatio: false,
//         plugins: { legend: { display: false } },
//         scales: {
//           y: { beginAtZero: true, max: this.Y_MAX['weekly'] }
//         }
//       }
//     });
//   }

//   createBarChart(): void {
//     this.barChart = new Chart(this.barChartRef.nativeElement, {
//       type: 'bar',
//       data: {
//         labels: [],
//         datasets: [{
//           label: 'Score',
//           data: [],
//           backgroundColor: '#40C1AC',
//           borderRadius: 8
//         }]
//       },
//       options: {
//         responsive: true,
//         maintainAspectRatio: false,
//         plugins: {
//           legend: { display: false },
//           annotation: {
//             annotations: {
//               thresholdLine: {
//                 type: 'line',
//                 yMin: 70,
//                 yMax: 70,
//                 borderColor: 'red',
//                 borderWidth: 2,
//                 borderDash: [6, 6],
//                 label: {
//                   display: true,
//                   position: 'end'
//                 }
//               }
//             }
//           }
//         },
//         scales: {
//           y: {
//             beginAtZero: true,
//             max: this.Y_MAX['weekly'] 
//           }
//         }
//       }
//     });
//   }

//   // ================================
//   // 🔥 UPDATE CHARTS DYNAMICALLY
//   // ================================

//   onPeriodChange(period: 'daily' | 'weekly' | 'monthly'): void {
//   if (!this.ltcPatient) return;
//   this.selectedPeriod = period;
//   this.loadRecommendation(period);

//   let labels: string[] = [];
//   let data: number[] = [];

//   switch(period) {
//     case 'daily':
//       labels = ['Lunch', 'Dinner'];
//       data = [50, 65];
//       break;
//     case 'weekly':
//       labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
//       data = [150, 165, 155, 170, 160, 180, 175];
//       break;
//     case 'monthly':
//       labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
//       data = [270, 300, 250, 320];
//       break;
//   }

//   const yMax = this.Y_MAX[period]; // ✅ get y max dynamically

//   // Update line chart
//   if (this.lineChart) {
//     this.lineChart.data.labels = labels;
//     this.lineChart.data.datasets[0].data = data;
//     (this.lineChart.options.scales!['y'] as any).max = yMax;
//     this.lineChart.update();
//   }

//   // Update bar chart
//   if (this.barChart) {
//     this.barChart.data.labels = labels;
//     this.barChart.data.datasets[0].data = data;
//     (this.barChart.options.scales!['y'] as any).max = yMax; 
//     this.barChart.update();
//   }
// }

//   ngOnDestroy(): void {
//     if (this.lineChart) this.lineChart.destroy();
//     if (this.barChart) this.barChart.destroy();
//     if (this.routeSub) this.routeSub.unsubscribe();
//   }
}