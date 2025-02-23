export interface DBBookChapter {
  id: number;
  book_id: string;
  chapter_id: string;
  source_id: string;
  chapter: string;
  content: string;
}
export const CREATE_BOOK_CHAPTERS_TABLE = `CREATE TABLE IF NOT EXISTS book_chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    chapter TEXT NOT NULL,
    content TEXT,
    UNIQUE(book_id, chapter_id, source_id)
);`;

export const ADD_BOOK_CHAPTER = `INSERT OR REPLACE INTO book_chapters (
  id,
  book_id,
  chapter_id,
  source_id,
  chapter,
  content
) VALUES (
  (SELECT id FROM book_chapters WHERE book_id = $1 AND chapter_id = $2 AND source_id = $3),
  $1, $2, $3, $4, $5
);`;

export const GET_BOOK_CHAPTER = `SELECT * FROM book_chapters WHERE book_id = $1 AND chapter_id = $2 AND source_id = $3;`;

export const DELETE_BOOK_CHAPTER = `DELETE FROM book_chapters WHERE book_id = $1 AND chapter_id = $2 AND source_id = $3;`;

export const DELETE_ALL_BOOK_CHAPTERS = `DELETE FROM book_chapters WHERE book_id = $1;`;
