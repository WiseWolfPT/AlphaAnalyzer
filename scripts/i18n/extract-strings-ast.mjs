#!/usr/bin/env node

/**
 * Extração Automática de Strings para Tradução (AST-based)
 *
 * Usa Babel AST parser para encontrar strings hardcoded em:
 * - JSX text content
 * - String literals em props
 * - Template literals
 * - Placeholders, aria-labels, etc.
 *
 * Gera: client/public/locales/en/extracted.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_DIR = path.join(__dirname, '../../client/src');
const OUTPUT_DIR = path.join(__dirname, '../../client/public/locales/en');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'extracted.json');

// Strings a ignorar (técnicas, não traduzíveis)
const IGNORE_PATTERNS = [
  /^[A-Z_]+$/, // CONSTANTS
  /^[a-z]+:[\/\\]/, // paths (http://, file://)
  /^\$/, // variables ($var)
  /^[0-9]+$/, // numbers
  /^[a-z0-9-]+\.(ts|tsx|js|jsx|json|css|svg|png)$/, // file extensions
  /^#[0-9a-f]{3,8}$/i, // colors (#fff, #ff00ff)
  /^(true|false|null|undefined)$/i, // literals
  /^(px|rem|em|vh|vw|%)$/i, // CSS units
  /^className$/i, // React props
  /^[a-z]+\.[a-z]+$/, // objeto.propriedade
];

// Strings técnicas comuns (whitelist de ignorar)
const TECHNICAL_STRINGS = new Set([
  'div', 'span', 'button', 'input', 'select', 'option',
  'className', 'onClick', 'onChange', 'onSubmit',
  'children', 'value', 'placeholder', 'aria-label',
  'xs', 'sm', 'md', 'lg', 'xl', '2xl',
  'primary', 'secondary', 'ghost', 'link',
  'GET', 'POST', 'PUT', 'DELETE', 'PATCH',
  'localhost', 'production', 'development',
]);

// Resultado: Map de string → metadata
const extractedStrings = new Map();

/**
 * Verifica se string deve ser traduzida
 */
function shouldTranslate(str) {
  if (!str || typeof str !== 'string') return false;

  const trimmed = str.trim();

  // Muito curta
  if (trimmed.length < 3) return false;

  // Técnica conhecida
  if (TECHNICAL_STRINGS.has(trimmed)) return false;

  // Match com padrões de ignorar
  if (IGNORE_PATTERNS.some(pattern => pattern.test(trimmed))) return false;

  // Contém apenas símbolos/números
  if (/^[^a-zA-Z]+$/.test(trimmed)) return false;

  // Parece código (contém {}, (), <>, etc em demasia)
  const codeChars = (trimmed.match(/[{}()<>[\]]/g) || []).length;
  if (codeChars > trimmed.length * 0.3) return false;

  return true;
}

/**
 * Gera chave de tradução a partir da string
 */
function generateKey(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);
}

/**
 * Extrai strings de um ficheiro usando Babel AST
 */
function extractFromFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(CLIENT_DIR, filePath);

  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
  } catch (error) {
    console.warn(`⚠️  Erro ao parsear ${relativePath}:`, error.message);
    return;
  }

  traverse.default(ast, {
    // JSX Text: <div>Hello World</div>
    JSXText(path) {
      const text = path.node.value.trim();
      if (shouldTranslate(text)) {
        addString(text, relativePath, 'jsx-text');
      }
    },

    // String Literal: "Search Stocks", 'My Portfolio'
    StringLiteral(path) {
      // Ignorar imports
      if (path.parent.type === 'ImportDeclaration') return;

      const text = path.node.value;
      if (shouldTranslate(text)) {
        addString(text, relativePath, 'string-literal');
      }
    },

    // JSX Attribute: placeholder="Enter text"
    JSXAttribute(path) {
      if (path.node.value?.type === 'StringLiteral') {
        const text = path.node.value.value;
        const attrName = path.node.name.name;

        // Apenas atributos que contêm texto visível
        const translatableAttrs = ['placeholder', 'title', 'aria-label', 'alt', 'label'];
        if (translatableAttrs.includes(attrName) && shouldTranslate(text)) {
          addString(text, relativePath, `jsx-attr:${attrName}`);
        }
      }
    },
  });
}

/**
 * Adiciona string ao mapa de extraídas
 */
function addString(text, filePath, type) {
  if (!extractedStrings.has(text)) {
    extractedStrings.set(text, {
      key: generateKey(text),
      text,
      files: [],
      types: new Set(),
    });
  }

  const data = extractedStrings.get(text);
  if (!data.files.includes(filePath)) {
    data.files.push(filePath);
  }
  data.types.add(type);
}

/**
 * Gera ficheiro JSON organizado
 */
function generateJSON() {
  const output = {};

  // Organizar por namespace (pages, components, common)
  for (const [text, data] of extractedStrings) {
    const firstFile = data.files[0];
    let namespace = 'common';

    if (firstFile.includes('/pages/')) {
      namespace = 'pages';
    } else if (firstFile.includes('/components/')) {
      namespace = 'components';
    }

    if (!output[namespace]) {
      output[namespace] = {};
    }

    // Usar a string original como chave (facilita lookup)
    output[namespace][text] = text;
  }

  return output;
}

/**
 * Main
 */
async function main() {
  console.log('🔍 Extraindo strings para tradução...\n');

  // Encontrar todos os ficheiros .tsx e .ts
  const files = await glob('**/*.{ts,tsx}', {
    cwd: CLIENT_DIR,
    ignore: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.d.ts'],
    absolute: true,
  });

  console.log(`📄 Encontrados ${files.length} ficheiros\n`);

  // Processar cada ficheiro
  let processed = 0;
  for (const file of files) {
    extractFromFile(file);
    processed++;
    if (processed % 10 === 0) {
      process.stdout.write(`\r   Processados: ${processed}/${files.length}`);
    }
  }
  process.stdout.write(`\r   Processados: ${processed}/${files.length}\n`);

  // Gerar JSON
  const json = generateJSON();

  // Estatísticas
  const totalStrings = extractedStrings.size;
  const byNamespace = {};
  for (const ns of Object.keys(json)) {
    byNamespace[ns] = Object.keys(json[ns]).length;
  }

  console.log('\n📊 Estatísticas:');
  console.log(`   Total de strings: ${totalStrings}`);
  for (const [ns, count] of Object.entries(byNamespace)) {
    console.log(`   - ${ns}: ${count}`);
  }

  // Guardar ficheiro
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(json, null, 2), 'utf-8');

  console.log(`\n✅ Ficheiro gerado: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
  console.log('\n💡 Próximo passo: npm run translate (traduzir para PT-PT)\n');
}

main().catch(console.error);
