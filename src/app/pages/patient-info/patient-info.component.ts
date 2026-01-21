import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

import { MenuBarComponent } from "../../components/menu-bar/menu-bar.component";
import { BackComponent } from "../../components/back/back.component";
import { SearchBarComponent } from "../../components/search-bar/search-bar.component";
import { NotifComponent } from "../../components/notif/notif.component";
import { MainOptionsComponent } from "../../components/main-options/main-options.component";
import { DateContainerComponent } from "../../components/date-container/date-container.component";
import { PatientCardComponent } from "../../components/patient-card/patient-card.component";
import { BmiCardComponent } from "../../components/bmi-card/bmi-card.component";
import { BpCardComponent } from "../../components/bp-card/bp-card.component";
import { MealAssignmentComponent } from "../../components/meal-assignment/meal-assignment.component";

import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { PatientDetailsComponent } from '../../components/patient-details/patient-details.component';
import { CloudTestService } from '../../services/cloud-test.service';
import { EditPatientComponent } from "../../components/edit-patient/edit-patient.component";

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
    BmiCardComponent,
    BpCardComponent,
    MealAssignmentComponent,
    FormsModule,
    PatientDetailsComponent,
    EditPatientComponent
],
  templateUrl: './patient-info.component.html',
  styleUrls: ['./patient-info.component.scss']
})
export class PatientInfoComponent implements OnInit {
  patientId: number = 1;  
  loading: boolean = true;
  error: string | null = null;

  currentView: string = 'default'; 

  lunchHasMeal: boolean = false;
  dinnerHasMeal: boolean = false;

  isMobileMenuOpen = false; 

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

  constructor(private router: Router, private cloudTestService: CloudTestService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.patientId = this.getPatientIdFromRoute() || 1;
    console.log('Patient ID:',this.patientId)
    
    // this.cloudTestService.getPatientData().subscribe({
    //   next: (data) => {
    //     console.log('Patient data:', data);
    //   },
    //   error: (err) => {
    //     console.error('CloudTestService error:', err);
    //   }
    // });

    // this.cloudTestService.getFoodData().subscribe({
    //   next: (data) => {
    //     console.log('Food data:', data);
    //   },
    //   error: (err) => {
    //     console.error('CloudTestService error:', err);
    //   }
    // });

    // this.cloudTestService.getMealData('1').subscribe({
    //   next: (data) => {
    //     console.log('Meal data:', data);
    //   },
    //   error: (err) => {
    //     console.error('CloudTestService error:', err);
    //   }
    // });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const path = event.urlAfterRedirects;
        this.updateCurrentView(path);
      });
    this.updateCurrentView(this.router.url);
  }

  private updateCurrentView(path: string): void {
    if (path.endsWith('/add') || path === 'add') {
      this.currentView = 'addRecord';

    } else if (path.endsWith('/all') || path === 'all') {
      this.currentView = 'allRecord';

    } else if (path.endsWith('/print') || path === 'print') {
      this.currentView = 'printRecord';

    } else if (/\/patient-info\/view\/\d+$/.test(path)) {
      // Matches patient-info/view/:id format
      this.currentView = 'patientRecord';
      // Extract patient ID from view URL
      const viewMatch = path.match(/\/patient-info\/view\/(\d+)$/);
      if (viewMatch) {
        this.patientId = parseInt(viewMatch[1], 10);
      }

    } else if (/\/patient-info\/edit\/\d+$/.test(path)) {
      // Matches patient-info/edit/:id format
      this.currentView = 'editRecord';
      // Extract patient ID from edit URL
      const editMatch = path.match(/\/patient-info\/edit\/(\d+)$/);
      if (editMatch) {
        this.patientId = parseInt(editMatch[1], 10);
      }

    }  else {
      this.currentView = 'default';
    }

    console.log('Current view updated to:', this.currentView, 'Patient ID:', this.patientId);
  }

  getPatientIdFromRoute(): number | null {
    const url = this.router.url;
    
    // Try view format first
    let match = url.match(/\/patient-info\/view\/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    
    // Try edit format
    match = url.match(/\/patient-info\/edit\/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    
    // Try legacy format
    match = url.match(/\/patient-info\/(\d+)/);
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
    console.log('Navigate to Patient Record');
    this.router.navigate(['/patient-info/view' + this.patientId]);
  }

  navigateToEditPatient(): void {
    console.log('Navigate to Edit Patient');
    this.router.navigate(['/patient-info/edit' + this.patientId]);
  }

  // Called by MenuBar to toggle main content dimming
  onMobileMenuToggle(isOpen: boolean) {
    this.isMobileMenuOpen = isOpen;
  }
}
