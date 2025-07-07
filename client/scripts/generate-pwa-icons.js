#!/usr/bin/env node

/**
 * Script para gerar todos os ícones necessários para PWA
 * Requer: npm install sharp
 * 
 * Uso: node scripts/generate-pwa-icons.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração dos tamanhos de ícones necessários
const iconSizes = [
  16, 32, 72, 96, 128, 144, 152, 192, 384, 512
];

// Cria um ícone base SVG do Alfalyzer
const baseSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="102" fill="#D1F934"/>
  <g transform="translate(128, 128)">
    <path d="M64 80 L64 176 L48 160 L16 192 L64 240 L112 192 L80 160 L80 80 Z" fill="#000000"/>
    <path d="M176 240 L176 144 L192 160 L224 128 L176 80 L128 128 L160 160 L160 240 Z" fill="#000000"/>
    <rect x="0" y="112" width="256" height="32" fill="#000000"/>
  </g>
</svg>
`;

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Garante que o diretório público existe
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log('🎨 Gerando ícones PWA para Alfalyzer...');

  // Salva o SVG base
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), baseSvg);
  console.log('✓ SVG base criado');

  // Gera PNGs em diferentes tamanhos
  for (const size of iconSizes) {
    try {
      await sharp(Buffer.from(baseSvg))
        .resize(size, size)
        .png()
        .toFile(path.join(publicDir, `icon-${size}.png`));
      
      console.log(`✓ Gerado icon-${size}.png`);
    } catch (error) {
      console.error(`✗ Erro ao gerar icon-${size}.png:`, error.message);
    }
  }

  // Gera ícone maskable (com padding extra)
  const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#D1F934"/>
  <g transform="translate(156, 156) scale(0.8)">
    <path d="M64 80 L64 176 L48 160 L16 192 L64 240 L112 192 L80 160 L80 80 Z" fill="#000000"/>
    <path d="M176 240 L176 144 L192 160 L224 128 L176 80 L128 128 L160 160 L160 240 Z" fill="#000000"/>
    <rect x="0" y="112" width="256" height="32" fill="#000000"/>
  </g>
</svg>
`;

  // Gera ícones maskable
  for (const size of [192, 512]) {
    try {
      await sharp(Buffer.from(maskableSvg))
        .resize(size, size)
        .png()
        .toFile(path.join(publicDir, `icon-maskable-${size}.png`));
      
      console.log(`✓ Gerado icon-maskable-${size}.png`);
    } catch (error) {
      console.error(`✗ Erro ao gerar icon-maskable-${size}.png:`, error.message);
    }
  }

  // Gera favicon.ico (multi-resolução)
  try {
    await sharp(Buffer.from(baseSvg))
      .resize(32, 32)
      .toFile(path.join(publicDir, 'favicon.ico'));
    
    console.log('✓ Gerado favicon.ico');
  } catch (error) {
    console.error('✗ Erro ao gerar favicon.ico:', error.message);
  }

  // Gera screenshots placeholders
  const screenshotMobile = `
<svg width="360" height="800" viewBox="0 0 360 800" xmlns="http://www.w3.org/2000/svg">
  <rect width="360" height="800" fill="#000000"/>
  <rect x="20" y="20" width="320" height="60" rx="8" fill="#1a1a1a"/>
  <text x="180" y="55" text-anchor="middle" fill="#D1F934" font-family="Arial" font-size="24" font-weight="bold">Alfalyzer</text>
  <rect x="20" y="100" width="320" height="680" rx="8" fill="#1a1a1a"/>
  <text x="180" y="400" text-anchor="middle" fill="#666" font-family="Arial" font-size="16">Dashboard Mobile</text>
</svg>
`;

  const screenshotDesktop = `
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="1920" height="1080" fill="#000000"/>
  <rect x="50" y="50" width="1820" height="80" rx="8" fill="#1a1a1a"/>
  <text x="960" y="100" text-anchor="middle" fill="#D1F934" font-family="Arial" font-size="36" font-weight="bold">Alfalyzer Professional Analytics</text>
  <rect x="50" y="180" width="1820" height="850" rx="8" fill="#1a1a1a"/>
  <text x="960" y="600" text-anchor="middle" fill="#666" font-family="Arial" font-size="24">Dashboard Desktop</text>
</svg>
`;

  try {
    await sharp(Buffer.from(screenshotMobile))
      .png()
      .toFile(path.join(publicDir, 'screenshot-mobile.png'));
    
    console.log('✓ Gerado screenshot-mobile.png');
  } catch (error) {
    console.error('✗ Erro ao gerar screenshot-mobile.png:', error.message);
  }

  try {
    await sharp(Buffer.from(screenshotDesktop))
      .png()
      .toFile(path.join(publicDir, 'screenshot-desktop.png'));
    
    console.log('✓ Gerado screenshot-desktop.png');
  } catch (error) {
    console.error('✗ Erro ao gerar screenshot-desktop.png:', error.message);
  }

  console.log('\n✅ Geração de ícones PWA concluída!');
  console.log('📁 Ícones salvos em:', publicDir);
}

// Executa se chamado diretamente
generateIcons().catch(console.error);

export { generateIcons };