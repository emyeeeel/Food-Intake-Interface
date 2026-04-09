import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnInit
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

Chart.register(...registerables, annotationPlugin);

@Component({
  selector: 'app-patient-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-analysis.component.html',
  styleUrls: ['./patient-analysis.component.scss'],
})
export class PatientAnalysisComponent implements AfterViewInit, OnDestroy, OnInit {

  @ViewChild('lineChart') lineChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;

  selectedPeriod: 'daily' | 'weekly' | 'monthly' = 'weekly';

  readonly Y_MAX = {
  daily: 100,
  weekly: 250,
  monthly: 500
};

  private lineChart!: Chart;
  private barChart!: Chart;
  private routeSub!: Subscription;

  ltcPatient?: LTCPatient;
  ltcPatientId!: number;

  recommendationText: string = '';
  recommendationLoading: boolean = false;
  recommendationError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private patientService: PatientService,
    private recommenderService: RecommenderService
  ) {}

  // 🔥 Listen to route changes
  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      this.ltcPatientId = Number(params.get('id'));
      this.loadPatientData();
    });
  }

  // 🔥 Create charts ONCE
  ngAfterViewInit(): void {
    this.createLineChart();
    this.createBarChart();
  }

  loadPatientData(): void {
    this.patientService.getLTCPatient(this.ltcPatientId).subscribe(patient => {
      this.ltcPatient = patient;
      this.onPeriodChange('daily');
    });
  }

  loadRecommendation(period: 'daily' | 'weekly' | 'monthly'): void {
    this.recommendationLoading = true;
    this.recommendationError = null;
    this.recommendationText = '';

    let request$;

    switch (period) {
      case 'daily':
        request$ = this.recommenderService.getDailyRecommendations(this.ltcPatientId);
        break;
      case 'weekly':
        request$ = this.recommenderService.getWeeklyRecommendations(this.ltcPatientId);
        break;
      case 'monthly':
        // no monthly endpoint — fall back to general nutrients
        request$ = this.recommenderService.getGeneralNutrientRecommendations(this.ltcPatientId);
        break;
    }

    request$.subscribe({
      next: (response) => {
        this.recommendationText = response['response'] ?? JSON.stringify(response, null, 2);
        this.recommendationLoading = false;
      },
      error: (err) => {
        console.error('Recommendation error:', err);
        this.recommendationError = '無法載入飲食建議';
        this.recommendationLoading = false;
      }
    });
  }

  // ================================
  // CHART CREATION (EMPTY INIT)
  // ================================

  createLineChart(): void {
    this.lineChart = new Chart(this.lineChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: '#40C1AC',
          backgroundColor: 'rgba(64,193,172,0.15)',
          fill: true,
          tension: 0.4,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: this.Y_MAX['weekly'] }
        }
      }
    });
  }

  createBarChart(): void {
    this.barChart = new Chart(this.barChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Score',
          data: [],
          backgroundColor: '#40C1AC',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          annotation: {
            annotations: {
              thresholdLine: {
                type: 'line',
                yMin: 70,
                yMax: 70,
                borderColor: 'red',
                borderWidth: 2,
                borderDash: [6, 6],
                label: {
                  display: true,
                  position: 'end'
                }
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: this.Y_MAX['weekly'] 
          }
        }
      }
    });
  }

  // ================================
  // 🔥 UPDATE CHARTS DYNAMICALLY
  // ================================

  onPeriodChange(period: 'daily' | 'weekly' | 'monthly'): void {
  if (!this.ltcPatient) return;
  this.selectedPeriod = period;
  this.loadRecommendation(period);

  let labels: string[] = [];
  let data: number[] = [];

  switch(period) {
    case 'daily':
      labels = ['Lunch', 'Dinner'];
      data = [50, 65];
      break;
    case 'weekly':
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      data = [150, 165, 155, 170, 160, 180, 175];
      break;
    case 'monthly':
      labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      data = [270, 300, 250, 320];
      break;
  }

  const yMax = this.Y_MAX[period]; // ✅ get y max dynamically

  // Update line chart
  if (this.lineChart) {
    this.lineChart.data.labels = labels;
    this.lineChart.data.datasets[0].data = data;
    (this.lineChart.options.scales!['y'] as any).max = yMax;
    this.lineChart.update();
  }

  // Update bar chart
  if (this.barChart) {
    this.barChart.data.labels = labels;
    this.barChart.data.datasets[0].data = data;
    (this.barChart.options.scales!['y'] as any).max = yMax; 
    this.barChart.update();
  }
}

  ngOnDestroy(): void {
    if (this.lineChart) this.lineChart.destroy();
    if (this.barChart) this.barChart.destroy();
    if (this.routeSub) this.routeSub.unsubscribe();
  }
}