#!/usr/bin/env tsx
/**
 * SUPABASE CREDENTIALS UPDATER
 * 
 * Atualiza automaticamente o .env com credenciais reais do Supabase
 * mantendo todas as outras configurações intactas
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m', 
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}🔧 ALFALYZER - SUPABASE CREDENTIALS UPDATER${colors.reset}`);
console.log(`${colors.cyan}============================================${colors.reset}\n`);

interface SupabaseCredentials {
  projectUrl: string;
  anonKey: string;
  serviceRoleKey: string;
}

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

async function promptUser(question: string): Promise<string> {
  const rl = createReadlineInterface();
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function collectCredentials(): Promise<SupabaseCredentials> {
  console.log(`${colors.blue}📋 Coletando Credenciais Supabase...${colors.reset}\n`);
  
  console.log(`${colors.yellow}📖 Instruções:${colors.reset}`);
  console.log(`1. Acesse seu projeto Supabase: https://supabase.com/dashboard`);
  console.log(`2. Vá para Settings > API`);
  console.log(`3. Copie e cole as credenciais abaixo:`);
  console.log();
  
  const projectUrl = await promptUser(`${colors.cyan}🔗 Project URL (https://seu-projeto.supabase.co): ${colors.reset}`);
  
  if (!projectUrl.startsWith('https://') || !projectUrl.includes('supabase.co')) {
    throw new Error('URL do projeto inválida. Deve ser algo como: https://seu-projeto.supabase.co');
  }
  
  const anonKey = await promptUser(`${colors.cyan}🔑 Anon Key (eyJhbGciOiJIUzI1NiIs...): ${colors.reset}`);
  
  if (!anonKey.startsWith('eyJ')) {
    throw new Error('Anon Key inválida. Deve começar com "eyJ"');
  }
  
  const serviceRoleKey = await promptUser(`${colors.cyan}🛡️  Service Role Key (eyJhbGciOiJIUzI1NiIs...): ${colors.reset}`);
  
  if (!serviceRoleKey.startsWith('eyJ')) {
    throw new Error('Service Role Key inválida. Deve começar com "eyJ"');
  }
  
  console.log();
  
  return {
    projectUrl,
    anonKey,
    serviceRoleKey
  };
}

function validateCredentials(credentials: SupabaseCredentials): boolean {
  console.log(`${colors.blue}🔍 Validando Credenciais...${colors.reset}`);
  
  const issues: string[] = [];
  
  if (!credentials.projectUrl.match(/^https:\/\/[a-z0-9]+\.supabase\.co$/)) {
    issues.push('URL do projeto deve ter formato: https://projeto.supabase.co');
  }
  
  if (credentials.anonKey.length < 100) {
    issues.push('Anon Key parece muito curta');
  }
  
  if (credentials.serviceRoleKey.length < 100) {
    issues.push('Service Role Key parece muito curta');
  }
  
  if (credentials.anonKey === credentials.serviceRoleKey) {
    issues.push('Anon Key e Service Role Key não podem ser iguais');
  }
  
  if (issues.length > 0) {
    console.log(`${colors.red}❌ Problemas encontrados:${colors.reset}`);
    issues.forEach(issue => console.log(`   • ${issue}`));
    return false;
  }
  
  console.log(`${colors.green}✅ Credenciais válidas${colors.reset}\n`);
  return true;
}

function updateEnvFile(credentials: SupabaseCredentials): boolean {
  console.log(`${colors.blue}📝 Atualizando arquivo .env...${colors.reset}`);
  
  const envPath = '.env';
  const backupPath = '.env.backup.' + Date.now();
  
  try {
    // Create backup
    if (fs.existsSync(envPath)) {
      fs.copyFileSync(envPath, backupPath);
      console.log(`   📄 Backup criado: ${backupPath}`);
    }
    
    // Read current .env
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }
    
    // Update Supabase URLs
    const updates = [
      {
        key: 'SUPABASE_URL',
        value: credentials.projectUrl,
        description: 'Backend Supabase URL'
      },
      {
        key: 'VITE_SUPABASE_URL', 
        value: credentials.projectUrl,
        description: 'Frontend Supabase URL'
      },
      {
        key: 'SUPABASE_SERVICE_ROLE_KEY',
        value: credentials.serviceRoleKey,
        description: 'Backend Service Role Key (SECURE)'
      },
      {
        key: 'SUPABASE_ANON_KEY',
        value: credentials.anonKey,
        description: 'Backend Anon Key'
      },
      {
        key: 'VITE_SUPABASE_ANON_KEY',
        value: credentials.anonKey,
        description: 'Frontend Anon Key (PUBLIC)'
      }
    ];
    
    // Update each key
    for (const update of updates) {
      const regex = new RegExp(`^${update.key}=.*$`, 'm');
      const newLine = `${update.key}=${update.value}`;
      
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, newLine);
        console.log(`   ✓ Updated ${update.key}`);
      } else {
        envContent += `\n# ${update.description}\n${newLine}\n`;
        console.log(`   ✓ Added ${update.key}`);
      }
    }
    
    // Write updated .env
    fs.writeFileSync(envPath, envContent);
    
    console.log(`${colors.green}✅ Arquivo .env atualizado com sucesso${colors.reset}\n`);
    return true;
    
  } catch (error) {
    console.log(`${colors.red}❌ Erro ao atualizar .env:${colors.reset}`);
    console.log(`   ${error}`);
    
    // Restore backup if it exists
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, envPath);
      console.log(`   🔄 Backup restaurado automaticamente`);
    }
    
    return false;
  }
}

function generateNextSteps(credentials: SupabaseCredentials): void {
  console.log(`${colors.magenta}🎉 CREDENCIAIS CONFIGURADAS COM SUCESSO!${colors.reset}`);
  console.log(`${colors.magenta}===================================${colors.reset}\n`);
  
  console.log(`${colors.green}✅ CONFIGURAÇÃO COMPLETA:${colors.reset}`);
  console.log(`• Supabase URL: ${credentials.projectUrl}`);
  console.log(`• Credenciais frontend e backend atualizadas`);
  console.log(`• Backup do .env anterior criado`);
  console.log(`• Pronto para executar migrations`);
  
  console.log(`\n${colors.blue}📖 PRÓXIMOS PASSOS:${colors.reset}`);
  console.log(`1. Executar migrations SQL:`);
  console.log(`   ${colors.yellow}npm run migrate:supabase${colors.reset}`);
  console.log();
  console.log(`2. Ou executar manualmente:`);
  console.log(`   ${colors.yellow}npx tsx scripts/execute-supabase-migration.ts${colors.reset}`);
  console.log();
  console.log(`3. Testar aplicação:`);
  console.log(`   ${colors.yellow}npm run dev${colors.reset}`);
  
  console.log(`\n${colors.cyan}🔗 LINKS ÚTEIS:${colors.reset}`);
  const baseUrl = credentials.projectUrl.replace('/rest/v1', '');
  console.log(`• Dashboard: ${baseUrl}/project/default`);
  console.log(`• SQL Editor: ${baseUrl}/project/default/sql`);
  console.log(`• Auth Settings: ${baseUrl}/project/default/auth/settings`);
  
  console.log(`\n${colors.yellow}⚠️  SEGURANÇA:${colors.reset}`);
  console.log(`• Service Role Key nunca deve ser exposta no frontend`);
  console.log(`• Anon Key é segura para uso público`);
  console.log(`• Arquivo .env nunca deve ser commitado no Git`);
}

// Main execution
async function main(): Promise<void> {
  try {
    console.log(`${colors.yellow}🚀 Configurando credenciais Supabase para o Alfalyzer...${colors.reset}\n`);
    
    const credentials = await collectCredentials();
    
    const isValid = validateCredentials(credentials);
    if (!isValid) {
      console.log(`\n${colors.red}❌ Por favor, verifique suas credenciais e tente novamente.${colors.reset}`);
      process.exit(1);
    }
    
    const updated = updateEnvFile(credentials);
    if (!updated) {
      process.exit(1);
    }
    
    generateNextSteps(credentials);
    
  } catch (error) {
    console.error(`${colors.red}💥 Erro durante configuração:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Export for use as module
export { main as updateSupabaseCredentials };

// Run if called directly
if (require.main === module) {
  main();
}