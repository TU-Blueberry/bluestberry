import {
  AfterViewInit,
  Component,
  ContentChildren,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import {TabTemplateDirective} from 'src/app/tab/tab-template.directive';
import {Tab} from 'src/app/tab/model/tab.model';
import {TabManagementService} from 'src/app/tab/tab-management.service';
import {filter} from 'rxjs/operators';
import { Actions, ofActionSuccessful, Store } from '@ngxs/store';
import { TabChange } from '../actions/tab.action';
import { ActiveChange } from '../actions/active.actions';
import { Hints } from 'src/app/actionbar/actions/hints.action';
import { ExperienceAction } from 'src/app/experience/actions';

@Component({
  selector: 'app-tab-group',
  templateUrl: './tab-group.component.html',
  styleUrls: ['./tab-group.component.scss']
})
export class TabGroupComponent implements AfterViewInit {
  scrollPosition = 0;

  @ContentChildren(TabTemplateDirective, {descendants: true})
  templates?: QueryList<TabTemplateDirective>;

  @ViewChild('tabcontainer', { read: ViewContainerRef, static: true })
  viewContainerRef?: ViewContainerRef;

  @Input()
  dataSource: Tab[] = [];

  @Output()
  dataSourceChange = new EventEmitter<Tab[]>();

  @Output()
  activeTabChange = new EventEmitter<Tab | undefined>();

  @Input()
  id = '';

  _activeTab?: Tab;
  set activeTab(value) {
    if (this._activeTab && this._activeTab.type === 'HINT') {
      this.store.dispatch(new Hints.Inactive());
    }

    if (value?.type === 'HINT') {
      this.store.dispatch(new Hints.Active());
    }

    this._activeTab = value;
    this.activeTabChange.emit(value);
    this.dispatchActiveChange();
    this.viewContainerRef?.detach();
    if (value) {
      if (!value.view) {
        const directive = this.templates?.find(template => template.type === value.type);
        const close = () => {
          const index = this.dataSource.indexOf(value);
          this.closeTab(index);
        }
        value.view = this.viewContainerRef?.createEmbeddedView(directive!.templateRef, { tab: value, close });
      } else {
        this.viewContainerRef?.insert(value.view);
      }
    }
  }
  get activeTab() {
    return this._activeTab;
  }

  constructor(private tabEventService: TabManagementService, private store: Store, private action$: Actions) {
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.activeTab = this.dataSource[0];
      this.activeTabChange.emit(this.activeTab);
      this.dispatchActiveChange();
    });
    this.tabEventService.openTab$.pipe(
      filter(tab => !!this.templates?.find(template => template.type === tab.type)),
      filter(tab => tab.groupId === this.id),
    ).subscribe(tab => {
      let existingTab;
      
      if (tab.type === "HINT" || tab.type === "UNITY") {
        existingTab = this.dataSource.find(t => t.type === tab.type);
      } else {
        existingTab = this.dataSource.find(t => t.path === tab.path);
      }

      if (!existingTab) {
        this.dataSource.push(tab);
        this.dataSourceChange.emit(this.dataSource);
        this.activeTab = tab;
      } else {
        this.activeTab = existingTab;
      }

      // Tab contains view and data (latter can be arbitrarly nested), which doesnt bode well with NGXS
      // Need to clone here as everything passed to NGXS is frozen; freezing EmbeddedViewRef causes significant
      // performance degradation (not worth as EmbeddedViewRef isn't even stored)
      this.dispatchTabChange()
      this.activeTabChange.emit(this.activeTab);
    });
    this.action$.pipe(
      ofActionSuccessful(ExperienceAction.Close)
    ).subscribe(() => this.closeAllTabs())
  }

  handleScroll(event: WheelEvent) {
    this.scrollPosition += event.deltaY;
    this.scrollPosition = Math.min(Math.max(0, this.scrollPosition), (event.target as HTMLElement).scrollWidth);
    event.preventDefault();
  }

  startDrag(event: DragEvent, tab: TabTemplateDirective): void {
    //TBD
  }

  // only used when closing an experience, thus no state changes intended
  closeAllTabs(): void {
    this.viewContainerRef?.clear();
    this.dataSource = [];
    this._activeTab = undefined;
  }

  closeTab(index: number) {
    const tab = this.dataSource[index];
    tab.view?.destroy();
    this.dataSource.splice(index, 1);
    this.dataSourceChange.emit(this.dataSource);

    if (tab.type === 'HINT') {
      this.store.dispatch(new Hints.Close());
    }

    if (this._activeTab === tab) {
      // if activeTab is closed, set activeTab to tab on the right. If last tab is closed, set to tab on the left.
      // setter handles undefined correctly (in case last tab is closed)
      this.activeTab = this.dataSource[index] || this.dataSource[index - 1];
      this.activeTabChange.emit(this.activeTab);
      this.dispatchActiveChange();
    }

    this.dispatchTabChange();
  }

  private dispatchTabChange(): void {
    this.store.dispatch(new TabChange(this.id, this.cloneDataSource()))
  }

  private dispatchActiveChange(): void {
    this.store.dispatch(new ActiveChange(this.id, this.cloneActiveTab()));
  }

  private cloneActiveTab(): Tab | undefined {
    return this.activeTab ? [{ ...this.activeTab }].map(t => ({ type: t.type, title: t.title, path: t.path })).shift() : undefined;
  }

  private cloneDataSource() {
    return [...this.dataSource].map(t => ({ type: t.type, title: t.title, path: t.path }));
  }
}
