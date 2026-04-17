import type { BookItem, BookSource } from '@wuji-tauri/source-extension';
import type { DownloadTask } from '@/store/download/types';
import pLimit from 'p-limit';
import { invokePlugin, isTaskRunning, TASK_PREFIX } from '@/store/download/utils';
import { sanitizePathName } from '@/utils';
import { useStore } from '../../store';

export async function runBookFetcher(
  book: BookItem,
  source: BookSource,
  taskId: string,
  deps: {
    getTasks: () => DownloadTask[];
    addTask: (task: any) => Promise<void>;
    runBackgroundTask: (id: string, fn: () => Promise<void>) => void;
    loadTasks: () => Promise<void>;
  },
) {
  return deps.runBackgroundTask(taskId, async () => {
    const store = useStore();
    if (!book.chapters?.length) {
      const detail = await store.bookDetail(source, book);
      if (detail?.chapters)
        book.chapters = detail.chapters;
    }

    const chapters = book.chapters || [];
    const totalChunks = chapters.length;

    // 更新总章节数（如果发生变化）
    const tasks = deps.getTasks();
    const existingTask = tasks.find(t => t.id === taskId);
    if (existingTask && (existingTask.totalChunks ?? 0) !== totalChunks) {
      await deps.addTask({ ...existingTask, totalChunks });
    }

    const limit = pLimit(5);
    let nextIndexToWrite = 0;
    const writeBuffer = new Map<number, string>();
    let isWriting = false;

    const tryWriteSequential = async () => {
      if (isWriting)
        return;
      isWriting = true;
      try {
        while (writeBuffer.has(nextIndexToWrite)) {
          const content = writeBuffer.get(nextIndexToWrite)!;
          const title
            = chapters[nextIndexToWrite]?.title
              || `第 ${nextIndexToWrite + 1} 章`;
          const data = new TextEncoder().encode(content);

          await invokePlugin('append_collection_chunk', {
            taskId,
            index: nextIndexToWrite,
            title,
            data: Array.from(data),
          });

          writeBuffer.delete(nextIndexToWrite);
          nextIndexToWrite++;
        }
      }
      finally {
        isWriting = false;
      }
    };

    const downloadPromises = chapters.map((chapter, i) =>
      limit(async () => {
        if (!isTaskRunning(deps.getTasks(), taskId))
          return;

        const currentTask = deps.getTasks().find(t => t.id === taskId);
        if (currentTask?.completedChunks.includes(i)) {
          if (i === nextIndexToWrite) {
            nextIndexToWrite++;
            tryWriteSequential();
          }
          return;
        }

        // 频率控制
        const delay = i < 5 ? i * 300 : 100 + Math.random() * 200;
        await new Promise(r => setTimeout(r, delay));

        let content = '';
        try {
          const rawContent = await store.bookRead(source, book, chapter, { cacheMoreChapters: false });
          if (rawContent) {
            const title = chapter.title;
            content
              = title && !rawContent.trim().startsWith(title)
                ? `${title}\n\n${rawContent}`
                : rawContent;
          }
        }
        catch (e) {
          console.error(`[Download] 章节 ${i} 下载失败:`, e);
          content = `\n[章节: ${chapter.title || i + 1} 下载失败]\n`;
        }

        writeBuffer.set(i, content);
        await tryWriteSequential();
      }),
    );

    await Promise.all(downloadPromises);

    if (isTaskRunning(deps.getTasks(), taskId)) {
      await invokePlugin('finalize_collection_download', { taskId });
    }
  });
}

export function getBookTaskId(book: BookItem) {
  return `${TASK_PREFIX.BOOK}${sanitizePathName(book.id)}`;
}

export function getBookSavePath(book: BookItem) {
  const bookName = sanitizePathName(book.title || book.id, {
    removeSpaces: false,
  });
  return `${bookName}/${bookName}.txt`;
}
