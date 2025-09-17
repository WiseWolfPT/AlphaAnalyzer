import { spawnSync } from 'node:child_process';
import { rmSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const distDir = path.join(projectRoot, 'dist');
const serverOutDir = path.join(distDir, 'server');
const sharedOutDir = path.join(distDir, 'shared');

const run = (args) => {
  const result = spawnSync('npx', args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: npx ${args.join(' ')}`);
  }
};

const ensureDistDir = () => {
  mkdirSync(distDir, { recursive: true });
};

const cleanOutput = () => {
  rmSync(serverOutDir, { recursive: true, force: true });
  rmSync(sharedOutDir, { recursive: true, force: true });
};

const build = () => {
  ensureDistDir();
  cleanOutput();

  run([
    'sucrase',
    'server',
    '--out-dir',
    path.relative(projectRoot, serverOutDir),
    '--transforms',
    'typescript,jsx',
    '--copy-files',
  ]);

  run([
    'sucrase',
    'shared',
    '--out-dir',
    path.relative(projectRoot, sharedOutDir),
    '--transforms',
    'typescript,jsx',
    '--copy-files',
  ]);

  rewriteSharedImports();
};

const rewriteSharedImports = () => {
  const visit = (dir) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        visit(fullPath);
      } else if (path.extname(fullPath) === '.js') {
        rewriteFile(fullPath);
      }
    }
  };

  const rewriteFile = (filePath) => {
    const original = readFileSync(filePath, 'utf8');
    const updated = original.replace(/(['"])@shared\/([^'\"]+)\1/g, (match, quote, specifier) => {
      const hasExtension = path.extname(specifier) !== '';
      const targetPath = path.join(sharedOutDir, hasExtension ? specifier : `${specifier}.js`);
      const relative = path.relative(path.dirname(filePath), targetPath).split(path.sep).join('/');
      const normalized = relative.startsWith('.') ? relative : `./${relative}`;
      return `${quote}${normalized}${quote}`;
    });

    if (updated !== original) {
      writeFileSync(filePath, updated, 'utf8');
    }
  };

  visit(serverOutDir);
};

build();
