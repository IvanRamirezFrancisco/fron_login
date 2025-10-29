import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoogleAuthSetupComponent } from './google-auth-setup.component';

describe('GoogleAuthSetupComponent', () => {
  let component: GoogleAuthSetupComponent;
  let fixture: ComponentFixture<GoogleAuthSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoogleAuthSetupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoogleAuthSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
