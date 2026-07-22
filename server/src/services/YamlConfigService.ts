import * as fs from 'fs';
import { parseDocument, Document } from 'yaml';

export class YamlConfigService {
  private filePath: string;
  private doc: Document;

  constructor(filePath: string) {
    this.filePath = filePath;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    this.doc = parseDocument(fileContent);
  }

  get(key: string): any {
    return this.doc.get(key);
  }

  set(key: string, value: any): void {
    this.doc.set(key, value);
  }

  save(): void {
    fs.writeFileSync(this.filePath, this.doc.toString(), 'utf8');
  }
}
