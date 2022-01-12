import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PyodideAnimationComponent } from './pyodide-animation.component';

describe('PyodideAnimationComponent', () => {
  let component: PyodideAnimationComponent;
  let fixture: ComponentFixture<PyodideAnimationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PyodideAnimationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PyodideAnimationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
