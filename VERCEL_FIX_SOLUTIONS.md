# Soluções para o erro "No Output Directory named 'public' found"

## Solução 1: outputDirectory (Atual)
Já modificámos o `vercel.json` para incluir:
```json
"outputDirectory": "client/dist"
```

## Solução 2: Framework Vite
Se a Solução 1 não funcionar, renomeie `vercel-vite.json` para `vercel.json`:
```bash
mv vercel.json vercel-old.json
mv vercel-vite.json vercel.json
```

## Solução 3: Root Directory no Dashboard
No dashboard do Vercel:
1. Vá para Project Settings
2. Em "General" > "Root Directory"
3. Defina como: `client`
4. Em "Build & Development Settings":
   - Build Command: `npm run build`
   - Output Directory: `dist`

## Solução 4: Configuração Manual
No dashboard do Vercel:
1. Project Settings > Build & Development Settings
2. Override:
   - Framework Preset: `Vite`
   - Build Command: `cd client && npm install --legacy-peer-deps && npm run build`
   - Output Directory: `client/dist`
   - Install Command: `npm install --legacy-peer-deps`

## Solução 5: Build Output API
Crie um ficheiro `client/.vercel/output/config.json`:
```json
{
  "version": 3,
  "routes": [
    { "src": "/api/(.*)", "dest": "https://alphaanalyzer-wisewolfpt.coolify.app/api/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

## Solução 6: Script de Build Customizado
Use o `build-vercel.sh` que criámos:
```json
"buildCommand": "chmod +x build-vercel.sh && ./build-vercel.sh"
```

## Variáveis que podem estar a escapar:

1. **Node Version**: Verifique se o Vercel está a usar Node 18+
2. **PNPM/Yarn**: O Vercel pode estar a detetar o package manager errado
3. **Monorepo Detection**: O Vercel pode estar a tratar como monorepo
4. **Build Cache**: Limpe o cache no dashboard do Vercel

## Debug Steps:
1. Verifique os logs de build completos
2. Confirme que `client/dist` existe após o build
3. Verifique se há algum `.vercelignore` a bloquear ficheiros
4. Teste localmente com `vercel build`