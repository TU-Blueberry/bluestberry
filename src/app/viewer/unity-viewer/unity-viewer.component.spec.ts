import { ComponentFixture, TestBed } from '@angular/core/testing'
import { UnityComponent } from 'src/app/unity/unity.component'
import { UnityModule } from 'src/app/unity/unity.module'

import { UnityViewerComponent } from './unity-viewer.component'

describe('UnityViewerComponent', () => {
  let component: UnityViewerComponent
  let fixture: ComponentFixture<UnityViewerComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UnityViewerComponent],
      imports: [UnityModule],
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(UnityViewerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
