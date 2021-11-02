import { Component, Input, OnChanges, OnInit } from '@angular/core'
// import { PyodideService } from 'src/app/services/pyodide/pyodide.service'

@Component({
    selector: 'unity',
    templateUrl: './unity.component.html',
    styleUrls: ['./unity.component.scss'],
})
export class UnityComponent implements OnInit, OnChanges {
    gameInstance: any
    progress = 0
    isReady = false
    @Input() updateMessage = 0

    ngOnChanges(): void {
        console.log('UNITY CALLED! YEAH!')
        this.updateUnity()
    }

    // Return einen Wert direkt aus Unity raus in eine Javascript.

    //constructor(private pyodideService: PyodideService) {}
    constructor() {}

    ngOnInit(): void {
        const loader = (window as any).UnityLoader

        this.gameInstance = loader.instantiate(
            'gameContainer',
            '/assets/unity/berrysort/Build/berrysort.json',
            {
                onProgress: (gameInstance: any, progress: number) => {
                    this.progress = progress
                    if (progress === 1) {
                        this.isReady = true
                    }
                },
            }
        )
    }

    updateUnity() {
        console.log('UNITY CALLED!')
        this.sendValueFromPython()
        //this.sendMessageFromPython()
        //this.talkBackFromPython()
    }

    public sendValueFromPython() {
        this.gameInstance.SendMessage(
            'AngularCommunicator',
            'SpawnObject',
           // this.pyodideService.getGlobal('spawnObject')[0]
           "[1,0,1,1,0,0,1,1,0,0,0,0,1]"
        )
    }
/*     public sendMessageFromPython() {
        this.gameInstance.SendMessage(
            'AngularCommunicator',
            'RenderText',
            this.pyodideService.getGlobal('displayText')[0] + this.updateMessage
        )
    }
    public talkBackFromPython() {
        this.gameInstance.SendMessage(
            'AngularCommunicator',
            'TalkBackJS',
            this.pyodideService.getGlobal('talkBack')[0]
        )
    } */

    public sendValue(test: Number) {
        this.gameInstance.SendMessage(
            'AngularCommunicator',
            'SpawnObject',
            test
        )
    }
    public sendMessage(test: String) {
        this.gameInstance.SendMessage('AngularCommunicator', 'RenderText', test)
    }
}
