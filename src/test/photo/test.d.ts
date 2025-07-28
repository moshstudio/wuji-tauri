import { PhotoExtension } from '@wuji-tauri/source-extension';

declare class TestPhotoExtension extends PhotoExtension {
  id: string;
  name: string;
  version: string;
  baseUrl: string;
  pageSize: number;

  constructor();
}

export default TestPhotoExtension;
