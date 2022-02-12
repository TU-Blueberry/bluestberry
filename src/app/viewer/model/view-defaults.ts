import { ViewSettings } from "./view-settings";

export class ViewSizeDefaults {
    static readonly minSizeFiletree = 10;
    static readonly maxSizeFiletree = 30;
    static readonly minSizeTab = 10;
    static readonly maxSizeTab = 100;

    static readonly minSizeTerminal = 10;
    static readonly maxSizeTerminal = 100;
    static readonly minSizeTop = 30;
    static readonly maxSizeTop = 100;
}

export const ViewDefaultSettings: ViewSettings = {
    'filetree': { group: 0, order: 0, size: 20, visible: true, minSize: ViewSizeDefaults.minSizeFiletree, maxSize: ViewSizeDefaults.maxSizeFiletree },
    'left': { group: 0, order: 1, size: 0, visible: false, minSize: ViewSizeDefaults.minSizeTab, maxSize: ViewSizeDefaults.maxSizeTab },
    'right': { group: 0, order: 2, size: 0, visible: false, minSize: ViewSizeDefaults.minSizeTab, maxSize: ViewSizeDefaults.maxSizeTab },
    'emptyMessage': { group: 0, order: 3, size: 80, visible: true, minSize: 0, maxSize: 100 },
    'code': { group: 1, order: 0, size: 100, visible: false, minSize: ViewSizeDefaults.minSizeTop, maxSize: ViewSizeDefaults.maxSizeTop },
    'terminal': { group: 1, order: 1, size: 20, visible: false, minSize: ViewSizeDefaults.minSizeTerminal, maxSize: ViewSizeDefaults.maxSizeTerminal }
}