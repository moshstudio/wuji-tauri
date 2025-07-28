import { VideoExtension } from '@wuji-tauri/source-extension';

declare class TestVideoExtension extends VideoExtension {
  id: string;
  name: string;
  version: string;
  baseUrl: string;
  pageSize: number;

  constructor();
}

export default TestVideoExtension;
