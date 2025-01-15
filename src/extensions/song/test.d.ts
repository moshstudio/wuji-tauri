import { SongExtension } from ".";

declare class TestSongExtension extends SongExtension {
  id: string;
  name: string;
  version: string;
  baseUrl: string;
  pageSize: number;

  constructor();
}

export default TestSongExtension;
