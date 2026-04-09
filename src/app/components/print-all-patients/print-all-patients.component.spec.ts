import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintAllPatientsComponent } from './print-all-patients.component';

describe('PrintAllPatientsComponent', () => {
  let component: PrintAllPatientsComponent;
  let fixture: ComponentFixture<PrintAllPatientsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintAllPatientsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrintAllPatientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
