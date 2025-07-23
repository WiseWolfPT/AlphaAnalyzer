#!/usr/bin/env node

/**
 * Script para remover variáveis de ambiente do Vercel
 * URGENTE: Remove VITE_API_URL para resolver erro 401
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Variáveis problemáticas que devem ser removidas
const PROBLEMATIC_VARS = [
  'VITE_API_URL',
  'VITE_BACKEND_URL', // Caso exista
  'VITE_SERVER_URL'   // Caso exista
];

console.log(`${colors.yellow}🚨 REMOVENDO VARIÁVEIS PROBLEMÁTICAS DO VERCEL${colors.reset}\n`);

// Função para executar comandos
function exec(command, silent = false) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    if (!silent) console.log(output);
    return output;
  } catch (error) {
    if (!silent) console.error(`${colors.red}Erro: ${error.message}${colors.reset}`);
    return null;
  }
}

// Verificar se Vercel CLI está instalado
function checkVercelCLI() {
  const hasVercel = exec('which vercel', true);
  if (!hasVercel) {
    console.log(`${colors.red}❌ Vercel CLI não encontrado!${colors.reset}`);
    console.log(`${colors.yellow}Instale com: npm i -g vercel${colors.reset}`);
    return false;
  }
  return true;
}

// Listar variáveis atuais
function listCurrentVars() {
  console.log(`${colors.blue}📋 Listando variáveis atuais...${colors.reset}`);
  const vars = exec('vercel env ls', true);
  if (vars) {
    const problematicFound = PROBLEMATIC_VARS.filter(v => vars.includes(v));
    if (problematicFound.length > 0) {
      console.log(`${colors.red}⚠️  Variáveis problemáticas encontradas:${colors.reset}`);
      problematicFound.forEach(v => console.log(`   - ${v}`));
      return problematicFound;
    } else {
      console.log(`${colors.green}✅ Nenhuma variável problemática encontrada${colors.reset}`);
      return [];
    }
  }
  return [];
}

// Remover variável do Vercel
function removeVar(varName) {
  console.log(`${colors.yellow}🗑️  Removendo ${varName}...${colors.reset}`);
  
  // Tentar remover de todos os ambientes
  const environments = ['production', 'preview', 'development'];
  let removed = false;
  
  environments.forEach(env => {
    const result = exec(`vercel env rm ${varName} ${env} --yes`, true);
    if (result && !result.includes('Error')) {
      console.log(`   ✅ Removido de ${env}`);
      removed = true;
    }
  });
  
  if (removed) {
    console.log(`${colors.green}✅ ${varName} removida com sucesso!${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.yellow}⚠️  ${varName} não encontrada ou já removida${colors.reset}`);
    return false;
  }
}

// Criar arquivo de verificação
function createVerificationFile() {
  const verifyContent = `# Verificação de Remoção VITE_API_URL
Data: ${new Date().toISOString()}

## Variáveis Removidas:
${PROBLEMATIC_VARS.map(v => `- ${v}`).join('\n')}

## Próximos Passos:
1. Faça um novo deploy no Vercel
2. Verifique se o erro 401 foi resolvido
3. O frontend agora deve usar o proxy do Vercel (/api/*)

## Como Verificar:
\`\`\`bash
# No console do browser (produção)
fetch('/api/health').then(r => r.json()).then(console.log)
\`\`\`

Se retornar dados, o proxy está funcionando!
`;

  fs.writeFileSync('VERCEL_ENV_REMOVED.md', verifyContent);
  console.log(`${colors.green}📄 Arquivo de verificação criado: VERCEL_ENV_REMOVED.md${colors.reset}`);
}

// Função principal
async function main() {
  // Verificar CLI
  if (!checkVercelCLI()) {
    process.exit(1);
  }

  // Verificar se está logado
  console.log(`${colors.blue}🔐 Verificando autenticação...${colors.reset}`);
  const whoami = exec('vercel whoami', true);
  if (!whoami || whoami.includes('Error')) {
    console.log(`${colors.red}❌ Não autenticado no Vercel!${colors.reset}`);
    console.log(`${colors.yellow}Execute: vercel login${colors.reset}`);
    process.exit(1);
  }
  console.log(`${colors.green}✅ Autenticado como: ${whoami.trim()}${colors.reset}`);

  // Listar e remover variáveis problemáticas
  const problematicVars = listCurrentVars();
  
  if (problematicVars.length > 0) {
    console.log(`\n${colors.yellow}🔧 Removendo variáveis...${colors.reset}\n`);
    
    let removedCount = 0;
    problematicVars.forEach(varName => {
      if (removeVar(varName)) {
        removedCount++;
      }
    });

    console.log(`\n${colors.green}✅ PROCESSO CONCLUÍDO!${colors.reset}`);
    console.log(`${colors.green}   Variáveis removidas: ${removedCount}${colors.reset}`);
    
    // Criar arquivo de verificação
    createVerificationFile();
    
    console.log(`\n${colors.yellow}📌 PRÓXIMOS PASSOS:${colors.reset}`);
    console.log('1. Faça um novo deploy: vercel --prod');
    console.log('2. Teste o endpoint: curl https://seu-app.vercel.app/api/health');
    console.log('3. Verifique no browser se o erro 401 foi resolvido\n');
  } else {
    console.log(`\n${colors.green}✅ Ambiente já está limpo!${colors.reset}`);
    console.log('Nenhuma variável problemática encontrada.\n');
  }

  // Mostrar todas as variáveis restantes
  console.log(`${colors.blue}📋 Variáveis restantes no Vercel:${colors.reset}`);
  exec('vercel env ls');
}

// Executar
main().catch(error => {
  console.error(`${colors.red}❌ Erro fatal: ${error.message}${colors.reset}`);
  process.exit(1);
});