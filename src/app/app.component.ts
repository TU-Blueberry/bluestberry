import { Component } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { About } from './actionbar/actions/about.action';
import { AppState, AppStateModel } from './app.state';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'BluestBerry';
  isLoading = true;
  showAbout = false;
  settings$: Observable<any>;
  appState$: Observable<any>;

  constructor(private store: Store) {
    this.appState$ = this.store.select<AppStateModel>(AppState);

    this.appState$.subscribe(res => {
      this.isLoading = (res.status === "LOADING" || res.status === "INITIALIZING");
    })

    this.settings$ = this.store.select(state => state.actionbar.about);
    this.settings$.subscribe(s => {
      this.showAbout = s.active
    });
  }

  closeAbout(): void {
   this.store.dispatch(new About.Close());
  }
}