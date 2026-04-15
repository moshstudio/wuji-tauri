export type DownloadStatus
  = | 'pending'
    | 'downloading'
    | 'paused'
    | 'completed'
    | { pending: null }
    | { downloading: null }
    | { paused: null }
    | { completed: null }
    | { error: string };

export interface DownloadTask {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  savePath: string;
  category: 'Image' | 'Music' | 'Book' | 'Comic' | 'Video';
  status: DownloadStatus;
  totalSize: number;
  downloadedSize: number;
  totalChunks?: number;
  completedChunks: number[];
  chunkProgress?: Record<number, number>;
  createdAt: number;
  headers?: Record<string, string>;
  speed?: string;
  extra?: Record<string, string>;
}
