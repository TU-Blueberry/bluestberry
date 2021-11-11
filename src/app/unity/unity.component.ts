import {
  AfterViewInit,
  Component,
  Input,
  OnChanges,
  OnInit,
} from '@angular/core'
import { UnityScenes } from '../shared/unity.scenes.enum'
import { UnityService } from './unity.service'
// import { PyodideService } from 'src/app/services/pyodide/pyodide.service'

@Component({
  selector: 'unity',
  templateUrl: './unity.component.html',
  styleUrls: ['./unity.component.scss'],
})
export class UnityComponent implements OnInit, OnChanges, AfterViewInit {
  gameInstance: any
  progress = 0
  isReady = 0
  isEnabled = false
  @Input() updateMessage = 0

  /**
   * In case we want to update Unity with a binding I have included an example.
   */
  ngOnChanges(): void {
    console.log(this.updateMessage)
    this.unityService.updateUnity(this.updateMessage)
  }

  constructor(private unityService: UnityService) {}
  ngAfterViewInit(): void {}

  // Initialize Unity with our standard Scene.
  ngOnInit(): void {
    this.gameInstance = this.unityService.initUnity(UnityScenes.BerrySorter)
  }

  startUnity() {
    this.isEnabled = true
  }

  private updateUnity() {}
}