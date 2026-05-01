import { Component } from '@angular/core';
 // Add this import
import { NavigationEnd, Router } from '@angular/router'; // Add this import
import { MenuBarComponent } from "../../components/menu-bar/menu-bar.component";
import { MainOptionsComponent } from "../../components/main-options/main-options.component";
import { DateContainerComponent } from "../../components/date-container/date-container.component";
import { FilterIconComponent } from "../../components/filter-icon/filter-icon.component";
import { SearchBarComponent } from "../../components/search-bar/search-bar.component";
import { NotifComponent } from "../../components/notif/notif.component";
import { BackComponent } from "../../components/back/back.component";
import { FilterOptionsComponent } from "../../components/filter-options/filter-options.component";
import { IntakeLogComponent } from "../../components/intake-log/intake-log.component";
import { filter, forkJoin, Subscription } from 'rxjs';
import { AddIntakeComponent } from "../../components/add-intake/add-intake.component";
import { DisplayIntakeComponent } from '../../components/display-intake/display-intake.component';
import { PrintAllIntakesComponent } from '../../components/print-all-intakes/print-all-intakes.component';
import { IntakeRecord } from '../../models/food-intake.model';
import { IntakeService } from '../../services/intake.service';
import { EstimationService } from '../../services/estimate.service';
import { DateService } from '../../services/date.service';
import { EstimationResult } from '../../models/estimation.model';

@Component({
  selector: 'app-meal-intake',
  imports: [
    MenuBarComponent,
    MainOptionsComponent,
    DateContainerComponent,
    // FilterIconComponent,
    SearchBarComponent,
    NotifComponent,
    BackComponent,
    // FilterOptionsComponent,
    IntakeLogComponent,
    AddIntakeComponent,
    DisplayIntakeComponent,
    PrintAllIntakesComponent
],
  templateUrl: './meal-intake.component.html',
  styleUrl: './meal-intake.component.scss'
})
export class MealIntakeComponent {

  latestIntakes: { intake: IntakeRecord; volumes: EstimationResult[] }[] = [];
  isLoading = false;
  error: string | null = null;
  private dateSub?: Subscription;

  isMobileMenuOpen = false; 
  currentView: string = 'default'; 
  filterOptions: string[] = [
    '低過敏源飲食',
    '高纖維飲食',
    '低鈉飲食',
    '低脂飲食',
    '無乳糖飲食'
  ];

  constructor(
    private router: Router,
    private intakeService: IntakeService,
    private estimateService: EstimationService,
    private dateService: DateService
  ) {} 

  ngOnInit(): void {
    // Update view on navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updateCurrentView(event.urlAfterRedirects);
      });

    // Initial view based on URL
    this.updateCurrentView(this.router.url);

    this.dateSub = this.dateService.selectedDate$
    .subscribe(date => {
      this.loadLatestIntakes(date);
    });
  }

  ngOnDestroy(): void {
    this.dateSub?.unsubscribe();
  }

  loadLatestIntakes(selectedDate: Date): void {
  this.isLoading = true;
  this.latestIntakes = [];

  this.intakeService.getIntakes().subscribe({
    next: (records) => {

      const target = selectedDate.toDateString();

      const filtered = records
        .filter(r => new Date(r.recorded_at).toDateString() === target)
        .sort((a, b) =>
          new Date(b.recorded_at).getTime() -
          new Date(a.recorded_at).getTime()
        )
        .slice(0, 2);

      if (filtered.length === 0) {
        this.isLoading = false;
        return;
      }

      const requests = filtered.map(intake =>
        this.estimateService.getResultsByIntakeId(intake.id)
      );

      forkJoin(requests).subscribe({
        next: (resultsArray) => {
          this.latestIntakes = filtered.map((intake, index) => {
            const ok = resultsArray[index].filter(r => r.status === 'OK');

            return {
              intake,
              volumes: ok
            };
          });

          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });

    },
    error: () => {
      this.isLoading = false;
    }
  });
}

  formatPatientIdentifier(intake: IntakeRecord): string {
    const room = intake.ltc_patient_detail?.room_number;
    const bed = intake.ltc_patient_detail?.bed_number;

    if (!room && !bed) return '-';

    return `${room ?? ''}-${bed ?? ''}`;
  }

  getFormattedVolume(record: { volumes: EstimationResult[] }): string {
    const raw = record.volumes[0]?.total_volume_ml;
    if (raw == null) return '0';
    const num = parseFloat(raw as any);
    return isNaN(num) ? '0' : num.toFixed(2);
  }

  private updateCurrentView(path: string): void {
    if (path.endsWith('/add') || path === 'add') {
      this.currentView = 'add';
    } else if (path.endsWith('/all') || path === 'all') {
      this.currentView = 'all';
    } else if (path.endsWith('/print') || path === 'print') {
      this.currentView = 'print';
    } else {
      this.currentView = 'default';
    }
  } 

  navigateToAddIntake(): void {
    console.log('Navigate to Add Intake Log');
    this.router.navigate(['/meal-intake/add']);
  }

  navigateToAllLogs(): void {
    console.log('Navigate to See All Logs');
    this.router.navigate(['/meal-intake/all']);
  }

  navigateToPrintLogs(): void {
    console.log('Navigate to Print Intake Log');
    this.router.navigate(['/meal-intake/print']);
  }

  // Called by MenuBar to toggle main content dimming
  onMobileMenuToggle(isOpen: boolean) {
    this.isMobileMenuOpen = isOpen;
  }
}
