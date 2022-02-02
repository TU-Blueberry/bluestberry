import { Component, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { UiEventsService } from '../ui-events.service';
import { Terminal } from '../viewer/actions/terminal.actions';
import { ActionbarModel } from './actionbar.state';
import { About } from './actions/about.action';
import { Filetree } from './actions/filetree.action';
import { Hints } from './actions/hints.action';
import { Tour } from './actions/tour.action';

@Component({
  selector: 'app-actionbar',
  templateUrl: './actionbar.component.html',
  styleUrls: ['./actionbar.component.scss']
})
export class ActionbarComponent implements OnInit {
  settings: ActionbarModel = {
    'filetree': { active: true },
    'terminal': { active: false },
    'hints': { active: false },
    'tour': { active: false },
    'about': { active: false }
}

  actionBarState$: Observable<any>;

  constructor(private uiEv: UiEventsService, private store: Store) {   
    this.actionBarState$ = this.store.select(state => state.actionbar);
  }

  ngOnInit(): void {
    this.actionBarState$.subscribe(v => {
      this.settings = { ...v };
    }); 
  }

  toggleFiles(): void {
    this.settings.filetree.active ? this.store.dispatch(new Filetree.Close(0)) : this.store.dispatch(new Filetree.Open(0));
  }

  // clicking on openHints if hints are already open causes hint file to be loaded from fs again
  // because tab group component has no mechanism to refocus an existing tab
  // same "problem" applies to every other element in the filetree 
  openHints(): void {
    this.store.dispatch(new Hints.Open());
  }

  toggleTerminal(): void {
    this.settings.terminal.active ? this.store.dispatch(new Terminal.Close()) : this.store.dispatch(new Terminal.Open());
  }

  startTour(): void {
    this.store.dispatch(new Tour.Start());
  }

  openAbout(ev: Event): void {
    ev.stopPropagation();
    this.store.dispatch(new About.Open());
  }
}
