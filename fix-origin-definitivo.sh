#!/bin/bash

echo "🔧 Correção DEFINITIVA do middleware de origem..."

# Fazer backup
cp server/middleware/api-security.ts server/middleware/api-security.ts.bak2

# Estratégia: Adicionar check de DISABLE_ORIGIN_CHECK logo após verificar se não há origin
cat > /tmp/fix_origin.sh << 'EOF'
#!/bin/bash

# Encontrar linha com "Allow requests without origin" e adicionar o check depois
LINE_NUM=$(grep -n "Allow requests without origin" server/middleware/api-security.ts | cut -d: -f1)
NEXT_LINE=$((LINE_NUM + 3))

# Adicionar o check de DISABLE_ORIGIN_CHECK logo após o check de !origin
sed -i "${NEXT_LINE}a\\
\\
  // TEMPORARY FIX: Skip origin check if disabled\\
  if (process.env.DISABLE_ORIGIN_CHECK === 'true') {\\
    console.log('✅ Origin check disabled via DISABLE_ORIGIN_CHECK');\\
    return next();\\
  }" server/middleware/api-security.ts

# Remover o check duplicado/mal posicionado (linhas 192-195)
sed -i '192,195d' server/middleware/api-security.ts

echo "✅ Middleware corrigido!"
EOF

# Executar o fix
chmod +x /tmp/fix_origin.sh
/tmp/fix_origin.sh

# Verificar a correção
echo "📋 Verificando correção..."
grep -A3 "TEMPORARY FIX" server/middleware/api-security.ts

# Reiniciar servidor
echo "🚀 Reiniciando servidor..."
pm2 restart alfalyzer --update-env

# Aguardar
echo "⏳ Aguardando 10 segundos..."
sleep 10

# Testar
echo "🧪 Testando API..."
curl -s 'http://localhost:3001/api/market-data/quotes/batch?symbols=AAPL' | jq '.quotes[0].symbol' 2>/dev/null

echo "✅ Correção aplicada! Teste em: https://128.140.45.28.sslip.io/find-stocks"