import { BookExtension } from '@wuji-tauri/source-extension';

declare class TestBookExtension extends BookExtension {
  id: string;
  name: string;
  version: string;
  baseUrl: string;
  pageSize: number;

  constructor();
}

export default TestBookExtension;
