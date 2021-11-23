import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommonActionsComponent } from './common-actions.component';

describe('FolderActionsComponent', () => {
  let component: CommonActionsComponent;
  let fixture: ComponentFixture<CommonActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CommonActionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CommonActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
