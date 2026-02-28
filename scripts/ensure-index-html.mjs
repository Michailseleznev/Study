import { copyFileSync, existsSync, lstatSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const indexPath = resolve(root, 'index.html');
const fallbackPath = resolve(root, 'app.html');

const log = (message) => console.log(`[ensure-index-html] ${message}`);

const findBackupDir = () => {
  let suffix = 0;
  while (true) {
    const candidate = resolve(root, suffix === 0 ? 'index.html.dir' : `index.html.dir.${suffix}`);
    if (!existsSync(candidate)) {
      return candidate;
    }
    suffix += 1;
  }
};

const ensureFileFromFallback = () => {
  if (!existsSync(fallbackPath) || !lstatSync(fallbackPath).isFile()) {
    throw new Error('Fallback file app.html is missing. Cannot create root index.html.');
  }
  copyFileSync(fallbackPath, indexPath);
  log('Created root index.html from app.html.');
};

if (existsSync(indexPath)) {
  const stat = lstatSync(indexPath);

  if (stat.isFile()) {
    log('Root index.html is already a file.');
    process.exit(0);
  }

  if (stat.isDirectory()) {
    const backupDir = findBackupDir();
    renameSync(indexPath, backupDir);
    log(`Detected directory conflict. Renamed to ${backupDir}.`);
    ensureFileFromFallback();
    process.exit(0);
  }

  throw new Error('Root index.html exists but is neither a file nor a directory.');
}

ensureFileFromFallback();
