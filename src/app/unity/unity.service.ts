import { Injectable } from '@angular/core'
import { PyodideService } from '../pyodide/pyodide.service'
import { PythonCallable } from '../python-callable/python-callable.decorator'
import { UnityBerryDTO } from '../shared/unity.berry.dto'

@Injectable({
  providedIn: 'root',
})
export class UnityService {
  constructor() {}
  gameInstance: any
  progress = 0
  isReady = false

  initUnity(path: string): any {
    const loader = (window as any).UnityLoader
    this.gameInstance = loader.instantiate('gameContainer', path, {
      onProgress: (gameInstance: any, progress: number) => {
        this.progress = progress
        if (progress === 1) {
          this.isReady = true
          this.disableWebGLInput()
        }
      },
    })

    return this.gameInstance
  }
  updateUnity(update: number) {}

  @PythonCallable
  public toggleRobot() {
    this.gameInstance.SendMessage('AngularCommunicator', 'ToggleRobot')
  }

  @PythonCallable
  public sendClassification(berries: string) {
    console.log('Sending Classification to Unity')
    console.log(berries)
    this.gameInstance.SendMessage(
      'AngularCommunicator',
      'receiveClassification',
      berries
    )
  }

  @PythonCallable
  public sendTraits(berries: string) {
    this.gameInstance.SendMessage(
      'AngularCommunicator',
      'receiveTraits',
      berries
    )
  }

  @PythonCallable
  public changeFPS(fps: string) {
    this.gameInstance.SendMessage(
      'AngularCommunicator',
      'changeRefreshAngular',
      fps
    )
  }

  @PythonCallable
  public stop() {
    this.gameInstance.SendMessage('AngularCommunicator', 'start')
  }

  @PythonCallable
  public start() {
    this.gameInstance.SendMessage('AngularCommunicator', 'stop')
  }

  @PythonCallable
  public toggleWebGLInput() {
    this.gameInstance.SendMessage('AngularCommunicator', 'toggleWebGLInput')
  }

  @PythonCallable
  public disableWebGLInput() {
    this.gameInstance.SendMessage('AngularCommunicator', 'disableWebGLInput')
  }

  @PythonCallable
  public sendManualBerries(berries: UnityBerryDTO[]) {
    for (var berry of berries) {
      this.sendManualBerry(
        `${berry.trait},${berry.classification},${berry.imagePath}`
      )
    }
  }

  // --- Manual Mode here ---
  @PythonCallable
  public enableManual() {
    this.gameInstance.SendMessage('AngularCommunicator', 'enableManual')
  }

  @PythonCallable
  public disableManual() {
    this.gameInstance.SendMessage('AngularCommunicator', 'disableManual')
  }

  // Send a Berry delimited by commata: trait,classification,imagePath
  @PythonCallable
  public sendManualBerry(berry: string) {
    this.gameInstance.SendMessage('AngularCommunicator', 'queueBerry', berry)
    this.sendImage('TODO GET IMAGE FROM FILESYSTEM VIA FILEPATH')
  }

  // And then send an Image. As soon as the Image has been created and Rendered the berry will be produced.
  // But not before.
  @PythonCallable
  public sendImage(image: string) {
    this.gameInstance.SendMessage('AngularCommunicator', 'acceptImage', image)
  }
}
