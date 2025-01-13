import { SongExtension } from ".";

declare class MiGuSongExtension extends SongExtension {
  id: string;
  name: string;
  version: string;
  baseUrl: string;
  pageSize: number;

  constructor();
}

export default MiGuSongExtension;
