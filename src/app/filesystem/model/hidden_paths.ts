
let _HIDDEN_PATHS: string[] = [];

export function setHiddenPaths(hiddenPaths: string[]) {
    _HIDDEN_PATHS = hiddenPaths;
}

export function isHiddenPath(path: string): boolean {
    for (const systemPath of _HIDDEN_PATHS) {
        if (path.startsWith(systemPath)) {
            return true;
        }
    }
    return false;
}
