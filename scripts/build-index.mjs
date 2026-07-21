import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const LESSONS_DIR = new URL('../docs/data/lessons', import.meta.url).pathname;
const INDEX_FILE = new URL('../docs/data/index.json', import.meta.url).pathname;

const files = (await readdir(LESSONS_DIR)).filter(f => f.endsWith('.json')).sort().reverse();

const lessons = await Promise.all(files.map(async file => {
  const data = JSON.parse(await readFile(join(LESSONS_DIR, file), 'utf8'));
  return {
    file,
    date: data.date,
    title: data.title,
    cardCount: data.cards?.length ?? 0
  };
}));

await writeFile(INDEX_FILE, JSON.stringify({ lessons }, null, 2));
console.log(`index.json: ${lessons.length} lesson(s)`);
