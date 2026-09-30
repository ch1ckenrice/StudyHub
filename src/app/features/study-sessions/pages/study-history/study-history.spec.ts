import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudyHistory } from './study-history';

describe('StudyHistory', () => {
  let component: StudyHistory;
  let fixture: ComponentFixture<StudyHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudyHistory],
    }).compileComponents();

    fixture = TestBed.createComponent(StudyHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
