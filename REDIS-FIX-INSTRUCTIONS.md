# 🔧 INSTRUÇÕES PARA CORRIGIR REDIS NO SERVIDOR

## OPÇÃO 1: Executar Script Automático (Recomendado)

1. **Conecte ao servidor:**
```bash
ssh root@128.140.45.28
```

2. **Crie o script no servidor:**
```bash
nano /tmp/fix-redis.sh
```

3. **Cole o conteúdo do arquivo `fix-redis-production.sh`**

4. **Execute o script:**
```bash
chmod +x /tmp/fix-redis.sh
sudo bash /tmp/fix-redis.sh
```

## OPÇÃO 2: Comandos Manuais Passo a Passo

Se preferir executar manualmente, siga estes comandos:

### 1. Instalar Redis
```bash
apt update
apt install -y redis-server
```

### 2. Configurar Redis
```bash
# Backup da configuração
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Gerar senha
REDIS_PASSWORD=$(openssl rand -base64 32)
echo "Senha Redis: $REDIS_PASSWORD"

# Editar configuração
nano /etc/redis/redis.conf
```

Adicione/modifique estas linhas:
```
bind 127.0.0.1 ::1
requirepass [SUA_SENHA_AQUI]
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### 3. Reiniciar Redis
```bash
systemctl restart redis-server
systemctl enable redis-server
systemctl status redis-server
```

### 4. Testar conexão
```bash
redis-cli -a [SUA_SENHA] ping
# Deve retornar: PONG
```

### 5. Atualizar .env.production
```bash
cd /home/teste\ 1/
nano .env.production
```

Adicione:
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=[SUA_SENHA_AQUI]
```

### 6. Reiniciar PM2
```bash
pm2 restart alfalyzer --update-env
pm2 logs alfalyzer --lines 20
```

### 7. Testar Health Endpoint
```bash
curl http://localhost:3001/api/health
```

Deve retornar:
```json
{
  "status": "healthy",
  "redis": "connected",
  "database": "connected"
}
```

## VERIFICAÇÃO FINAL

Execute estes comandos para confirmar que tudo está funcionando:

```bash
# Redis status
systemctl status redis-server

# PM2 status
pm2 status

# Health check
curl http://localhost:3001/api/health

# Logs PM2
pm2 logs alfalyzer --lines 50
```

## TROUBLESHOOTING

### Se o Redis não iniciar:
```bash
journalctl -u redis-server -n 50
```

### Se o health endpoint continuar com erro:
```bash
# Verificar logs do PM2
pm2 logs alfalyzer --lines 100

# Verificar se as variáveis foram carregadas
pm2 env alfalyzer | grep REDIS
```

### Se precisar resetar tudo:
```bash
systemctl stop redis-server
apt purge -y redis-server
rm -rf /etc/redis
apt install -y redis-server
# Depois siga os passos de configuração novamente
```

---

**IMPORTANTE:** Guarde a senha do Redis em local seguro após a configuração!