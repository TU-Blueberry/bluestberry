import { Component, NgModule, OnInit, Renderer2 } from '@angular/core'
import { UnityService } from 'src/app/unity/unity.service'

@Component({
  selector: 'app-unity-viewer',
  templateUrl: './unity-viewer.component.html',
  styleUrls: ['./unity-viewer.component.scss'],
})
export class UnityViewerComponent {
  startX = 0
  startWidth = 0
  unlistenMove!: () => void
  unlistenMouseUp!: () => void
  minCodeWidth = 100
  minSimulationWidth = 100
  pythonResult = ''
  visible = false

  constructor() {
    setTimeout(() => {
      this.visible = true
    }, 1000)
  }
}
