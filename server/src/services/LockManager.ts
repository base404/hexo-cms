import * as fs from 'fs';

export class LockManager {
  getFileMtime(filePath: string): number {
    if (!fs.existsSync(filePath)) {
      return 0;
    }
    const stat = fs.statSync(filePath);
    return stat.mtimeMs;
  }

  checkConflict(filePath: string, readMtime: number): boolean {
    const currentMtime = this.getFileMtime(filePath);
    return currentMtime > readMtime;
  }
}
