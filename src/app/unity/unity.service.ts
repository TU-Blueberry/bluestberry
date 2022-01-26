import { ThrowStmt } from '@angular/compiler'
import { Injectable } from '@angular/core'
import { FilesystemService } from '../filesystem/filesystem.service'
import { PythonCallable } from '../python-callable/python-callable.decorator'
import { UnityBerryDTO } from '../shared/unity/unity.berry.dto'

@Injectable({
  providedIn: 'root',
})
export class UnityService {
  constructor(private fsService: FilesystemService) {}
  gameInstance: any
  progress = 0
  isReady = false

  initUnity(path: string): any {
    if (this.gameInstance) {
      return this.gameInstance
    }
    const loader = (window as any).UnityLoader
    this.gameInstance = loader.instantiate('gameContainer', path, {
      onProgress: (gameInstance: any, progress: number) => {
        this.progress = progress
        if (progress === 1) {
          this.isReady = true
          this.disableWebGLInput()
          //this.initialPresentation()
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
    //console.log(berries)
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
    var berryParts: string[] = berry.split(',')
    var imagePath = berryParts[2]
    var berryImage = this.fsService.getFileAsBinary(imagePath)
    //console.log(imagePath)

    // TODO: This is bad practice but I can't help it right now.
    if (!berryImage) {
      return
    }

    berryImage.subscribe((result) => {
      //console.log(berryImage)
      if (result instanceof Uint8Array) {
        var blob = new Blob([result], { type: 'image/png' })

        var reader = new FileReader()
        reader.readAsDataURL(blob)
        reader.onloadend = () => {
          var base64data = reader.result
          if (base64data) {
            this.gameInstance.SendMessage(
              'AngularCommunicator',
              'queueBerryWithImage',
              berry + ',' + base64data.toString().split(',')[1]
            )
          }
        }
      }
    })
  }

  // And then send an Image. As soon as the Image has been created and Rendered the berry will be produced.
  // But not before.
  @PythonCallable
  public sendImage(image: string) {
    this.gameInstance.SendMessage('AngularCommunicator', 'acceptImage', image)
  }

  @PythonCallable
  public reset() {
    this.gameInstance.SendMessage('AngularCommunicator', 'reset')
  }

  @PythonCallable
  public initialPresentation() {
    this.gameInstance.SendMessage('AngularCommunicator', 'queueBerry')

    var berries: UnityBerryDTO[] = []

    for (var i = 0; i < 10; i++) {
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('0', '0', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '0', '0', '0'))
      berries.push(new UnityBerryDTO('1', '0', '0', '0'))
      berries.push(new UnityBerryDTO('0', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '0', '0', '0'))
      berries.push(new UnityBerryDTO('1', '0', '0', '0'))
    }

    /*  for (var i = 0; i < 10; i++) {
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('0', '0', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('0', '0', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
      berries.push(new UnityBerryDTO('1', '1', '0', '0'))
    } */

    var good: number = 0
    var bad: number = 0

    var baseGood = 'sortierroboter/BlueberryData/TestData/good_'
    var baseBad = 'sortierroboter/BlueberryData/TestData/bad_'
    var ending = '.JPG'

    for (var berry of berries) {
      var berrystring = `${berry.classification}, ${berry.trait},`

      // console.log(berry.trait)

      berrystring =
        berry.trait == '1'
          ? berrystring + baseGood + good + ending
          : berrystring + baseBad + bad + ending

      if (berry.trait == '1') good = good + 1
      if (berry.trait == '0') bad = bad + 1

      this.sendManualBerry(berrystring)
    }
  }
}
