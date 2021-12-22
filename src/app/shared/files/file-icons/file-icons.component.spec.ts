import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileIconsComponent } from './file-icons.component';

describe('FileIconsComponent', () => {
  let component: FileIconsComponent;
  let fixture: ComponentFixture<FileIconsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FileIconsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileIconsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
