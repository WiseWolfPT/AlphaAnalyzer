#!/usr/bin/env node

/**
 * Tradução Automática via DeepL API (Build-Time)
 *
 * Lê: client/public/locales/en/extracted.json
 * Gera: client/public/locales/pt/translated.json
 *
 * Usa cache para evitar retraduzir strings já traduzidas
 * Custo: ~1 chamada API para todo o projeto (batch)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Carregar .env
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../../client/public/locales');
const SOURCE_FILE = path.join(LOCALES_DIR, 'en/extracted.json');
const TARGET_FILE = path.join(LOCALES_DIR, 'pt/translated.json');
const CACHE_FILE = path.join(LOCALES_DIR, '.translation-cache.json');
const GLOSSARY_FILE = path.join(__dirname, '../../config/finance-glossary.json');

// DeepL API configuration
const DEEPL_API_KEY = process.env.DEEPL_API_KEY || process.env.VITE_DEEPL_API_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

// Cache de traduções (para não repetir chamadas)
let translationCache = {};

// Glossário de termos financeiros
let glossary = {};

/**
 * Carrega glossário de termos financeiros
 */
function loadGlossary() {
  if (fs.existsSync(GLOSSARY_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(GLOSSARY_FILE, 'utf-8'));
      glossary = data.glossary || {};
      console.log(`📚 Glossário carregado: ${Object.keys(glossary).length} termos financeiros`);
    } catch (error) {
      console.warn('⚠️  Erro ao carregar glossário');
      glossary = {};
    }
  }
}

/**
 * Carrega cache de traduções anteriores
 */
function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      translationCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      console.log(`📦 Cache carregado: ${Object.keys(translationCache).length} traduções`);
    } catch (error) {
      console.warn('⚠️  Erro ao carregar cache, começando do zero');
      translationCache = {};
    }
  }
}

/**
 * Guarda cache de traduções
 */
function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(translationCache, null, 2), 'utf-8');
}

/**
 * Preserva placeholders antes de traduzir
 */
function preservePlaceholders(text) {
  const placeholders = [];
  const patterns = [
    /\{\{([^}]+)\}\}/g,  // {{value}}
    /\{([^}]+)\}/g,      // {symbol}
    /%s/g,               // %s
    /%d/g,               // %d
    /%\([^)]+\)s/g,      // %(name)s
  ];

  let processed = text;
  patterns.forEach((pattern, idx) => {
    processed = processed.replace(pattern, (match) => {
      const placeholder = `__PLACEHOLDER_${placeholders.length}__`;
      placeholders.push(match);
      return placeholder;
    });
  });

  return { processed, placeholders };
}

/**
 * Restaura placeholders após tradução
 */
function restorePlaceholders(text, placeholders) {
  let restored = text;
  placeholders.forEach((original, idx) => {
    const placeholder = `__PLACEHOLDER_${idx}__`;
    restored = restored.replace(placeholder, original);
  });
  return restored;
}

/**
 * Aplica glossário manualmente (pre-replace)
 */
function applyGlossary(text) {
  let result = text;

  // Ordenar por tamanho (maior primeiro para evitar partial matches)
  const sortedTerms = Object.entries(glossary)
    .sort(([a], [b]) => b.length - a.length);

  for (const [en, pt] of sortedTerms) {
    // Case-sensitive replacement with word boundaries
    const regex = new RegExp(`\\b${en}\\b`, 'g');
    result = result.replace(regex, pt);
  }

  return result;
}

/**
 * Traduz texto usando DeepL API
 */
async function translateText(text) {
  // Cache hit
  if (translationCache[text]) {
    return translationCache[text];
  }

  // Preservar placeholders
  const { processed, placeholders } = preservePlaceholders(text);

  // Aplicar glossário primeiro (pre-translation)
  const withGlossary = applyGlossary(processed);

  // Chama API
  const response = await fetch(DEEPL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      auth_key: DEEPL_API_KEY,
      text: withGlossary,
      source_lang: 'EN',
      target_lang: 'PT', // PT = Português (DeepL usa PT para PT-PT)
      formality: 'default',
      preserve_formatting: '1',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepL API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  let translation = data.translations[0]?.text || text;

  // Restaurar placeholders
  translation = restorePlaceholders(translation, placeholders);

  // Guardar no cache
  translationCache[text] = translation;
  saveCache();

  return translation;
}

/**
 * Traduz múltiplas strings de uma vez (batch real)
 */
async function translateMultiple(texts) {
  const toTranslate = texts.filter(t => !translationCache[t]);
  if (toTranslate.length === 0) {
    return texts.map(t => translationCache[t]);
  }

  // Preparar textos com placeholders e glossário
  const prepared = toTranslate.map(text => {
    const { processed, placeholders } = preservePlaceholders(text);
    const withGlossary = applyGlossary(processed);
    return { original: text, processed: withGlossary, placeholders };
  });

  // Fazer batch request
  const params = new URLSearchParams({
    auth_key: DEEPL_API_KEY,
    source_lang: 'EN',
    target_lang: 'PT',
    formality: 'default',
    preserve_formatting: '1',
  });

  // DeepL aceita múltiplos parâmetros 'text'
  prepared.forEach(({ processed }) => {
    params.append('text', processed);
  });

  const response = await fetch(DEEPL_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepL API error (${response.status}): ${error}`);
  }

  const data = await response.json();

  // Restaurar placeholders e guardar cache
  prepared.forEach(({ original, placeholders }, idx) => {
    let translation = data.translations[idx]?.text || original;
    translation = restorePlaceholders(translation, placeholders);
    translationCache[original] = translation;
  });

  saveCache();

  // Retornar todas as traduções na ordem original
  return texts.map(t => translationCache[t]);
}

/**
 * Traduz lote de strings em chunks de 50
 */
async function translateBatch(strings, onProgress) {
  const results = {};
  const total = strings.length;
  let completed = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < strings.length; i += BATCH_SIZE) {
    const chunk = strings.slice(i, i + BATCH_SIZE);

    try {
      const translations = await translateMultiple(chunk);

      chunk.forEach((str, idx) => {
        results[str] = translations[idx];
        completed++;

        if (onProgress) {
          onProgress(completed, total);
        }
      });

      // Rate limiting: 500ms entre batches
      if (i + BATCH_SIZE < strings.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`\n❌ Erro batch ${i}-${i+BATCH_SIZE}:`, error.message);
      // Fallback para originais
      chunk.forEach(str => {
        results[str] = str;
        completed++;
      });
    }
  }

  return results;
}

/**
 * Processa ficheiro JSON e traduz
 */
async function translateFile() {
  if (!DEEPL_API_KEY) {
    console.error('\n❌ DEEPL_API_KEY não configurada!');
    console.log('\n💡 Configure:');
    console.log('   export DEEPL_API_KEY="sua_api_key"');
    console.log('   ou');
    console.log('   echo "DEEPL_API_KEY=sua_api_key" >> .env\n');
    process.exit(1);
  }

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`\n❌ Ficheiro fonte não encontrado: ${SOURCE_FILE}`);
    console.log('\n💡 Execute primeiro: npm run extract-strings\n');
    process.exit(1);
  }

  // Ler ficheiro fonte
  const source = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf-8'));

  // Extrair todas as strings únicas
  const allStrings = new Set();
  for (const namespace of Object.values(source)) {
    for (const str of Object.keys(namespace)) {
      allStrings.add(str);
    }
  }

  const uniqueStrings = Array.from(allStrings);
  console.log(`\n🌍 Traduzindo ${uniqueStrings.length} strings únicas para PT-PT...\n`);

  // Traduzir
  const translations = await translateBatch(uniqueStrings, (completed, total) => {
    const percent = Math.round((completed / total) * 100);
    const cached = translationCache[uniqueStrings[completed - 1]] !== undefined ? '📦' : '🌐';
    process.stdout.write(`\r   ${cached} Progresso: ${completed}/${total} (${percent}%)`);
  });

  console.log('\n');

  // Reconstruir estrutura com traduções
  const output = {};
  for (const [namespace, strings] of Object.entries(source)) {
    output[namespace] = {};
    for (const str of Object.keys(strings)) {
      output[namespace][str] = translations[str] || str;
    }
  }

  // Guardar ficheiro traduzido
  const targetDir = path.dirname(TARGET_FILE);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(TARGET_FILE, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`✅ Traduções geradas: ${path.relative(process.cwd(), TARGET_FILE)}`);
  console.log(`📦 Cache guardado: ${Object.keys(translationCache).length} entradas`);
  console.log('\n💡 Próximo passo: Integrar com react-i18next\n');
}

/**
 * Main
 */
async function main() {
  loadGlossary();
  loadCache();
  await translateFile();
}

main().catch(error => {
  console.error('\n❌ Erro fatal:', error.message);
  process.exit(1);
});
