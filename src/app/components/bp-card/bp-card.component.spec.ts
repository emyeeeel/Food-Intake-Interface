import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BpCardComponent } from './bp-card.component';

describe('BpCardComponent', () => {
  let component: BpCardComponent;
  let fixture: ComponentFixture<BpCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BpCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BpCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
