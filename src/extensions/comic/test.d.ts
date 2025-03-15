import { ComicExtension } from '.';

declare class TestComicExtension extends ComicExtension {
  id: string;
  name: string;
  version: string;
  baseUrl: string;
  pageSize: number;

  constructor();
}

export default TestComicExtension;
