import { ChangeDetectorRef, Component, OnInit, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { MenuBarComponent } from "../../components/menu-bar/menu-bar.component";
import { BackComponent } from "../../components/back/back.component";
import { SearchBarComponent } from "../../components/search-bar/search-bar.component";
import { NotifComponent } from "../../components/notif/notif.component";
import { MainOptionsComponent } from "../../components/main-options/main-options.component";
import { DateContainerComponent } from "../../components/date-container/date-container.component";
import { PatientCardComponent } from "../../components/patient-card/patient-card.component";
import { MealAssignmentComponent } from "../../components/meal-assignment/meal-assignment.component";

import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { PatientDetailsComponent } from '../../components/patient-details/patient-details.component';
import { CloudTestService } from '../../services/cloud-test.service';
import { EditPatientComponent } from "../../components/edit-patient/edit-patient.component";
import { AddPatientComponent } from "../../components/add-patient/add-patient.component";
import { WaterIntakeComponent } from "../../components/water-intake/water-intake.component";
import { ProteinIntakeComponent } from "../../components/protein-intake/protein-intake.component";
import { PatientMealsComponent } from "../../components/patient-meals/patient-meals.component";
import { PatientIntakeComponent } from "../../components/patient-intake/patient-intake.component";
import { DisplayPatientComponent } from "../../components/display-patient/display-patient.component";
import { PrintAllPatientsComponent } from "../../components/print-all-patients/print-all-patients.component";
import { IntakeService } from '../../services/intake.service';
import { PatientService } from '../../services/patient.service';
import { LTCPatient } from '../../models/ltc-patient.model';
import { PatientAnalysisComponent } from '../../components/patient-analysis/patient-analysis.component';
import { ViewIntakeComponent } from "../../components/view-intake/view-intake.component";

@Component({
  selector: 'app-patient-info',
  imports: [
    MenuBarComponent,
    BackComponent,
    SearchBarComponent,
    NotifComponent,
    MainOptionsComponent,
    DateContainerComponent,
    PatientCardComponent,
    MealAssignmentComponent,
    FormsModule,
    PatientDetailsComponent,
    EditPatientComponent,
    AddPatientComponent,
    WaterIntakeComponent,
    ProteinIntakeComponent,
    PatientMealsComponent,
    PatientIntakeComponent,
    DisplayPatientComponent,
    PrintAllPatientsComponent,
    PatientAnalysisComponent,
    ViewIntakeComponent
],
  templateUrl: './patient-info.component.html',
  styleUrls: ['./patient-info.component.scss']
})
export class PatientInfoComponent implements OnInit {
  patientId: number = 0;
  loading: boolean = true;
  error: string | null = null;

  currentView: string = 'default'; 

  lunchHasMeal: boolean = false;
  dinnerHasMeal: boolean = false;

  isMobileMenuOpen = false;

  // Patient search
  allPatients: LTCPatient[] = [];
  patientSearchQuery = '';
  patientSearchResults: LTCPatient[] = [];
  showPatientResults = false;

  onLunchStatus(status: boolean) {
    this.lunchHasMeal = status;
    this.cdr.detectChanges();
    console.log("Lunch meal assigned?", status);
  }

  onDinnerStatus(status: boolean) {
    this.dinnerHasMeal = status;
    this.cdr.detectChanges();
    console.log("Dinner meal assigned?", status);
  }

  constructor(
    private router: Router,
    private cloudTestService: CloudTestService,
    private cdr: ChangeDetectorRef,
    private intakeService: IntakeService,
    private patientService: PatientService,
  ) {}

  ngOnInit(): void {
    this.patientId = this.getPatientIdFromRoute() || 0;
    console.log('Patient ID:',this.patientId)

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const path = event.urlAfterRedirects;
        this.updateCurrentView(path);
      });
    this.updateCurrentView(this.router.url);
    this.loadAllPatients();
  }

  private updateCurrentView(path: string): void {

    if (path.endsWith('/add') || path === 'add') {
      this.currentView = 'addRecord';

    } else if (path.endsWith('/all') || path === 'all') {
      this.currentView = 'allRecord';

    } else if (path.endsWith('/print') || path === 'print') {
      this.currentView = 'printRecord';

    } else if (/\/patient-info\/\d+\/view$/.test(path)) {
      this.currentView = 'patientRecord';

      const match = path.match(/\/patient-info\/(\d+)\/view$/);
      if (match) this.patientId = parseInt(match[1], 10);

    } else if (/\/patient-info\/\d+\/edit$/.test(path)) {
      this.currentView = 'editRecord';

      const match = path.match(/\/patient-info\/(\d+)\/edit$/);
      if (match) this.patientId = parseInt(match[1], 10);

    } else if (/\/patient-info\/\d+\/meals$/.test(path)) {
      this.currentView = 'mealsRecord';

      const match = path.match(/\/patient-info\/(\d+)\/meals$/);
      if (match) this.patientId = parseInt(match[1], 10);

    } else if (/\/patient-info\/\d+\/intakes$/.test(path)) {
      this.currentView = 'intakesRecord';

      const match = path.match(/\/patient-info\/(\d+)\/intakes$/);
      if (match) this.patientId = parseInt(match[1], 10);

    } else if (/\/patient-info\/\d+\/analysis$/.test(path)) {
      this.currentView = 'analysis';

      const match = path.match(/\/patient-info\/(\d+)\/analysis$/);
      if (match) this.patientId = parseInt(match[1], 10);

    } else if (/\/patient-info\/\d+\/intakes\/\d+\/view$/.test(path)) {
      this.currentView = 'intake-report';

      const match = path.match(/\/patient-info\/(\d+)\/intakes\/(\d+)\/view$/);
      if (match) {
        this.patientId = parseInt(match[1], 10);
        const intakeId = parseInt(match[2], 10);
        console.log('Patient ID:', this.patientId);
        console.log('Intake ID:', intakeId);
      }
    }
    else {
      this.currentView = 'default';
    }

    console.log('Current view updated to:', this.currentView, 'Patient ID:', this.patientId);
  }

  getPatientIdFromRoute(): number | null {
    const url = this.router.url;

    const match = url.match(/\/patient-info\/(\d+)/);

    if (match) {
      return parseInt(match[1], 10);
    }

    return null;
  }

  onPatientIdChange(newPatientId: number): void {
    this.patientId = newPatientId; 
  }

  navigateToAddRecord(): void {
    console.log('Navigate to Add Record');
    this.router.navigate(['/patient-info/add']);
  }

  navigateToAllRecord(): void {
    console.log('Navigate to See All Records');
    this.router.navigate(['/patient-info/all']);
  }

  navigateToPrintRecord(): void {
    console.log('Navigate to Print Record');
    this.router.navigate(['/patient-info/print']);
  }

  navigateToPatientRecord(): void {
    this.router.navigate(['/patient-info', this.patientId, 'view']);
  }

  navigateToEditPatient(): void {
    this.router.navigate(['/patient-info', this.patientId, 'edit']);
  }

  onMobileMenuToggle(isOpen: boolean) {
    this.isMobileMenuOpen = isOpen;
  }

  // --- Patient search ---

  loadAllPatients(): void {
    this.patientService.getLTCPatients().subscribe({
      next: (patients) => {
        this.allPatients = patients;
        // If no patient selected, default to first one
        if (!this.patientId && patients.length > 0) {
          this.patientId = patients[0].id;
          this.cdr.detectChanges();
        }
      },
    });
  }

  onPatientSearch(): void {
    const q = this.patientSearchQuery.trim().toLowerCase();
    this.showPatientResults = true;
    if (!q) {
      this.patientSearchResults = this.allPatients.slice(0, 10);
      return;
    }
    this.patientSearchResults = this.allPatients
      .filter(p =>
        `${p.room_number}-${p.bed_number}`.includes(q) ||
        p.room_number.includes(q) ||
        (p.name || '').toLowerCase().includes(q)
      )
      .slice(0, 10);
  }

  selectPatient(id: number): void {
    this.patientId = id;
    this.patientSearchQuery = '';
    this.showPatientResults = false;
    this.cdr.detectChanges();
  }

  focusPatientSearch(): void {
    if (!this.allPatients.length) {
      this.loadAllPatients();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.patient-search-wrapper')) {
      this.showPatientResults = false;
    }
  }
}
