import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintAllIntakesComponent } from './print-all-intakes.component';

describe('PrintAllIntakesComponent', () => {
  let component: PrintAllIntakesComponent;
  let fixture: ComponentFixture<PrintAllIntakesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintAllIntakesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrintAllIntakesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
