import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDemandForecastComponent } from './admin-demand-forecast.component';

describe('AdminDemandForecastComponent', () => {
  let component: AdminDemandForecastComponent;
  let fixture: ComponentFixture<AdminDemandForecastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDemandForecastComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDemandForecastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
