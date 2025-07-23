#!/usr/bin/env node

/**
 * Script para verificar se o proxy do Vercel está funcionando
 * Confirma que VITE_API_URL foi removida e proxy está ativo
 */

const https = require('https');
const { execSync } = require('child_process');

// Cores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

console.log(`${colors.cyan}🔍 VERIFICAÇÃO DO PROXY VERCEL${colors.reset}\n`);

// Pegar URL do Vercel
function getVercelUrl() {
  try {
    // Tentar pegar do último deploy
    const output = execSync('vercel ls --limit 1', { encoding: 'utf8' });
    const lines = output.split('\n');
    
    // Procurar por URL na saída
    for (const line of lines) {
      if (line.includes('https://') && line.includes('.vercel.app')) {
        const match = line.match(/(https:\/\/[^\s]+\.vercel\.app)/);
        if (match) return match[1];
      }
    }
    
    // Se não encontrou, pedir ao usuário
    console.log(`${colors.yellow}⚠️  URL do Vercel não encontrada automaticamente${colors.reset}`);
    console.log('Por favor, forneça manualmente no formato: https://seu-app.vercel.app');
    return null;
  } catch (error) {
    return null;
  }
}

// Testar endpoint
function testEndpoint(url, path) {
  return new Promise((resolve) => {
    const fullUrl = `${url}${path}`;
    console.log(`${colors.blue}🧪 Testando: ${fullUrl}${colors.reset}`);
    
    https.get(fullUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`${colors.green}   ✅ Status: ${res.statusCode} - OK${colors.reset}`);
          try {
            const json = JSON.parse(data);
            console.log(`${colors.green}   📦 Resposta: ${JSON.stringify(json, null, 2)}${colors.reset}`);
            resolve({ success: true, status: res.statusCode, data: json });
          } catch {
            console.log(`${colors.green}   📦 Resposta: ${data.substring(0, 100)}...${colors.reset}`);
            resolve({ success: true, status: res.statusCode, data });
          }
        } else {
          console.log(`${colors.red}   ❌ Status: ${res.statusCode}${colors.reset}`);
          console.log(`${colors.red}   📦 Resposta: ${data}${colors.reset}`);
          resolve({ success: false, status: res.statusCode, data });
        }
      });
    }).on('error', (err) => {
      console.log(`${colors.red}   ❌ Erro: ${err.message}${colors.reset}`);
      resolve({ success: false, error: err.message });
    });
  });
}

// Verificar variáveis de ambiente
function checkEnvVars() {
  console.log(`${colors.blue}🔍 Verificando variáveis no Vercel...${colors.reset}`);
  
  try {
    const output = execSync('vercel env ls', { encoding: 'utf8', stdio: 'pipe' });
    const hasViteApiUrl = output.includes('VITE_API_URL');
    const hasViteBackendUrl = output.includes('VITE_BACKEND_URL');
    
    if (hasViteApiUrl || hasViteBackendUrl) {
      console.log(`${colors.red}❌ PROBLEMA: Variáveis problemáticas ainda existem!${colors.reset}`);
      if (hasViteApiUrl) console.log(`   - VITE_API_URL`);
      if (hasViteBackendUrl) console.log(`   - VITE_BACKEND_URL`);
      return false;
    } else {
      console.log(`${colors.green}✅ Nenhuma variável VITE_*_URL encontrada${colors.reset}`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Não foi possível verificar variáveis${colors.reset}`);
    return null;
  }
}

// Gerar relatório
function generateReport(results) {
  console.log(`\n${colors.cyan}📊 RELATÓRIO DE VERIFICAÇÃO${colors.reset}`);
  console.log('='.repeat(50));
  
  // Status das variáveis
  console.log(`\n${colors.blue}1. Variáveis de Ambiente:${colors.reset}`);
  if (results.envCheck === true) {
    console.log(`   ${colors.green}✅ VITE_API_URL removida com sucesso${colors.reset}`);
  } else if (results.envCheck === false) {
    console.log(`   ${colors.red}❌ VITE_API_URL ainda existe!${colors.reset}`);
  } else {
    console.log(`   ${colors.yellow}⚠️  Não foi possível verificar${colors.reset}`);
  }
  
  // Status do proxy
  console.log(`\n${colors.blue}2. Proxy do Vercel:${colors.reset}`);
  if (results.healthCheck?.success) {
    console.log(`   ${colors.green}✅ Proxy funcionando corretamente${colors.reset}`);
    console.log(`   ${colors.green}   - Endpoint /api/health respondendo${colors.reset}`);
  } else {
    console.log(`   ${colors.red}❌ Proxy não está funcionando${colors.reset}`);
    if (results.healthCheck?.status === 401) {
      console.log(`   ${colors.red}   - Ainda retornando erro 401${colors.reset}`);
    }
  }
  
  // Recomendações
  console.log(`\n${colors.blue}3. Recomendações:${colors.reset}`);
  if (results.envCheck && results.healthCheck?.success) {
    console.log(`   ${colors.green}✅ Tudo está funcionando corretamente!${colors.reset}`);
    console.log(`   ${colors.green}   O frontend agora usa o proxy /api/*${colors.reset}`);
  } else {
    if (!results.envCheck) {
      console.log(`   ${colors.yellow}1. Execute: npm run fix:vercel-env${colors.reset}`);
    }
    if (!results.healthCheck?.success) {
      console.log(`   ${colors.yellow}2. Faça um novo deploy: vercel --prod${colors.reset}`);
      console.log(`   ${colors.yellow}3. Aguarde 2-3 minutos para propagação${colors.reset}`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
}

// Script de teste no browser
function generateBrowserTest(url) {
  const script = `
// TESTE NO CONSOLE DO BROWSER
// Cole este código no console do navegador:

// 1. Testar health endpoint
fetch('${url}/api/health')
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(data => console.log('Health:', data))
  .catch(err => console.error('Erro:', err));

// 2. Testar se VITE_API_URL existe
console.log('VITE_API_URL:', window.VITE_API_URL || 'NÃO DEFINIDA (BOM!)');

// 3. Verificar configuração
console.log('Import meta env:', import.meta.env);
`;

  console.log(`\n${colors.cyan}🌐 SCRIPT PARA TESTAR NO BROWSER:${colors.reset}`);
  console.log('```javascript');
  console.log(script);
  console.log('```\n');
}

// Main
async function main() {
  const results = {};
  
  // 1. Verificar variáveis
  results.envCheck = checkEnvVars();
  
  // 2. Pegar URL do Vercel
  let vercelUrl = getVercelUrl();
  
  if (!vercelUrl) {
    // Se não tem URL, mostrar instruções
    console.log(`\n${colors.yellow}📌 INSTRUÇÕES MANUAIS:${colors.reset}`);
    console.log('1. Obtenha sua URL do Vercel');
    console.log('2. Execute: node scripts/verify-vercel-proxy.js https://sua-app.vercel.app');
    console.log('3. Ou faça deploy primeiro: vercel --prod\n');
    
    // Ainda assim gerar relatório parcial
    generateReport(results);
    return;
  }
  
  // 3. Testar endpoints
  console.log(`\n${colors.blue}🌐 URL do Vercel: ${vercelUrl}${colors.reset}\n`);
  
  // Testar /api/health
  results.healthCheck = await testEndpoint(vercelUrl, '/api/health');
  
  // 4. Gerar relatório
  generateReport(results);
  
  // 5. Mostrar script para browser
  if (vercelUrl) {
    generateBrowserTest(vercelUrl);
  }
}

// Verificar se foi passada URL como argumento
if (process.argv[2] && process.argv[2].startsWith('https://')) {
  // URL fornecida manualmente
  const vercelUrl = process.argv[2];
  console.log(`${colors.blue}🌐 Usando URL fornecida: ${vercelUrl}${colors.reset}\n`);
  
  (async () => {
    const results = {};
    results.envCheck = checkEnvVars();
    results.healthCheck = await testEndpoint(vercelUrl, '/api/health');
    generateReport(results);
    generateBrowserTest(vercelUrl);
  })();
} else {
  // Tentar detectar automaticamente
  main().catch(console.error);
}