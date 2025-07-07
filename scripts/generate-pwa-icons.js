// Script para gerar ícones PWA placeholder
// Em produção, substitua por ícones reais do Alfalyzer

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// SVG placeholder com o logo "A" do Alfalyzer
const svgContent = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#000000"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.4}" fill="#00FF00" opacity="0.2"/>
  <text x="${size/2}" y="${size/2}" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="#00FF00" text-anchor="middle" dominant-baseline="central">A</text>
</svg>
`;

// Criar diretório se não existir
const publicDir = path.join(__dirname, '..', 'client', 'public');

// Gerar ícones SVG como placeholder
sizes.forEach(size => {
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(publicDir, filename);
  
  fs.writeFileSync(filepath, svgContent(size));
  console.log(`✅ Gerado: ${filename}`);
});

// Criar badge
const badgeContent = `
<svg width="72" height="72" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
  <rect width="72" height="72" rx="16" fill="#000000"/>
  <circle cx="36" cy="36" r="24" fill="#00FF00"/>
</svg>
`;

fs.writeFileSync(path.join(publicDir, 'badge-72x72.svg'), badgeContent);
console.log(`✅ Gerado: badge-72x72.svg`);

// Criar screenshots placeholder
const screenshotContent = (width, height, text) => `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#0a0a0a"/>
  <rect x="20" y="20" width="${width-40}" height="${height-40}" fill="#111111" stroke="#00FF00" stroke-width="2" opacity="0.5"/>
  <text x="${width/2}" y="${height/2}" font-family="Arial, sans-serif" font-size="48" fill="#00FF00" text-anchor="middle" dominant-baseline="central">${text}</text>
</svg>
`;

fs.writeFileSync(
  path.join(publicDir, 'screenshot-1.svg'), 
  screenshotContent(1280, 720, 'Alfalyzer Dashboard')
);
fs.writeFileSync(
  path.join(publicDir, 'screenshot-2.svg'), 
  screenshotContent(1280, 720, 'Advanced Charts')
);

console.log(`✅ Gerados screenshots placeholder`);
console.log('\n⚠️  IMPORTANTE: Substitua estes SVGs por ícones PNG reais em produção!');