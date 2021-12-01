const SYSTEM_FOLDERS = ['/dev', '/home', '/lib', '/proc', '/tmp', '/bin'];

export function isSystemDirectory(path: string): boolean {
    for (const systemPath of SYSTEM_FOLDERS) {
        const reg = new RegExp(`(\/)?${systemPath}(\/)*`);

        if (reg.test(path)) {
            return true;
        }
    }

    return false;
}