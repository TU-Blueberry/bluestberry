import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SandboxCreationComponent } from './sandbox-creation.component';

describe('WorkspaceCreationComponent', () => {
  let component: SandboxCreationComponent;
  let fixture: ComponentFixture<SandboxCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SandboxCreationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SandboxCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
