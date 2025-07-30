// Test CORS fix proposal
const express = require('express');
const cors = require('cors');

const app = express();

// PROBLEMA ATUAL: Múltiplos middlewares CORS conflitando
console.log('=== PROBLEMA ATUAL ===');
console.log('1. handlePreflightRequests envia res.sendStatus(204)');
console.log('2. cors() tenta processar mas resposta já foi enviada');
console.log('3. forceCorsHeaders tenta adicionar headers -> CRASH');
console.log('');

// SOLUÇÃO PROPOSTA: Usar apenas cors() do npm
console.log('=== SOLUÇÃO PROPOSTA ===');
console.log('Remover handlePreflightRequests e forceCorsHeaders');
console.log('Usar apenas cors() com configuração dinâmica:');
console.log('');

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requisições sem origin (Postman, SSR)
    if (!origin) return callback(null, true);
    
    // Lista de origins permitidos
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://alfalyzer.vercel.app',
      'https://alfalyzerpro4.vercel.app'
    ];
    
    // Patterns para deployments dinâmicos
    const allowedPatterns = [
      /^https:\/\/alfalyzer.*\.vercel\.app$/,
      /^https:\/\/.*-antonios-projects-.*\.vercel\.app$/
    ];
    
    // Check exact match
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check patterns
    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    if (isAllowed) {
      console.log(`✅ CORS: Allowing dynamic origin: ${origin}`);
      return callback(null, true);
    }
    
    console.warn(`❌ CORS: Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400,
  optionsSuccessStatus: 204 // Important for legacy browsers
};

// Apenas este middleware é necessário!
app.use(cors(corsOptions));

console.log('✅ CORS configurado corretamente com apenas 1 middleware');
console.log('✅ O cors() do npm lida automaticamente com OPTIONS');
console.log('✅ Sem conflitos de headers duplos');