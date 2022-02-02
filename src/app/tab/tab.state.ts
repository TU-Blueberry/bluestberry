import { Injectable } from '@angular/core';
import { State, Action, StateContext } from '@ngxs/store';
import { OpenCloseTab } from '../viewer/actions/open-close-tab.action';
import { ActiveChange } from './actions/active.actions';
import { TabChange } from './actions/tab.action';
import { Tab } from './model/tab.model';

interface TabStateModel {
   [id: string]: {
       tabs: Tab[],
       active?: Tab
    }
}

@State<TabStateModel>({
    name: 'tabGroups',
    defaults: { }
})

@Injectable()
export class TabState {

    // TODO: welche der observables in tabgroup etc braucht es noch wirklich?
    @Action(TabChange)
    updateTabState(ctx: StateContext<TabStateModel>, action: TabChange) {
        const state = ctx.getState();
        const change = this.getChangeOriginAndType(state, action.id, action.tabs);
        const clonedState = this.cloneState(state, action.id)

        if (change.type !== 'other') {
            ctx.dispatch(new OpenCloseTab({ group: change.id, visible: change.type === 'open' }, 0))
        }

   
        clonedState[action.id].tabs = action.tabs;
        ctx.setState({
            ...clonedState
        })
    }

    @Action(ActiveChange)
    updateActiveTab(ctx: StateContext<TabStateModel>, action: ActiveChange) {
        const state = ctx.getState();
        const clonedState = this.cloneState(state, action.groupId);

        clonedState[action.groupId].active = action.activeTab;
        ctx.setState({
            ...clonedState                
        })
    }

    // find first tab group where either last tab was closed or first tab was opened
    private getChangeOriginAndType(oldGroups: TabStateModel, changedGroupId: string, changedGroupTabs: Tab[]) {
        const oldGroup = Object.entries(oldGroups).find(([id, _]) => id === changedGroupId);
    
        if (!oldGroup || !oldGroup[1].tabs) {
            return { id: changedGroupId, type: 'open' };
        }
      
        const firstOpenOrLastClosed = (oldGroup[1].tabs.length === 0 && changedGroupTabs.length === 1) 
                                        || (oldGroup[1].tabs.length === 1 && changedGroupTabs.length === 0)

        if (firstOpenOrLastClosed) {
            return { id: changedGroupId, type: changedGroupTabs.length === 0 ? 'close' : 'open' }
        } else {
            return { id: '', type: 'other'}
        }                              
    }

    private cloneState(state: TabStateModel, id: string): TabStateModel {
        const updatedState = { ... state };
        updatedState[id] = { ...state[id] };

        return updatedState;
    }
}