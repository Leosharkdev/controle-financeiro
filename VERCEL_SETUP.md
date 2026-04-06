# 🚀 Deploy no Vercel

## Passo 1: Acessar Vercel
1. **Acesse** [vercel.com](https://vercel.com)
2. **Faça login** com GitHub (usa a conta do GitHub que criou o repositório)

## Passo 2: Criar novo projeto
1. **Clique** "Add New" → "Project"
2. **Selecione** o repositório `controle-financeiro`
3. **Framework**: Selecione `Create React App` (ou deixe em branco que detecta)

## Passo 3: Configurar variáveis
1. **Em "Environment Variables"**, adicione:

```
REACT_APP_API_BASE_URL = https://controle-financeiro-ipva.onrender.com/api
```

⚠️ **IMPORTANTE**: Mude `controle-financeiro-ipva` para o nome do seu backend no Render

## Passo 4: Deploy
1. **Root Directory**: `frontend`
2. **Build Command**: `npm run build`
3. **Output Directory**: deixe em branco (detecta automaticamente)
4. **Clique** "Deploy"

## Pronto!
- Seu app estará em: `https://seu-projeto.vercel.app`
- Qualquer push no GitHub faz deploy automático

## Troubleshooting

### Se der erro "ENOENT: no such file"
- Verifique se o Root Directory é `frontend`

### Se não conectar ao backend
- Verifique se a variável `REACT_APP_API_BASE_URL` está correta
- Teste: `https://seu-backend-render.com/health`

### Se der erro de CORS
- O backend já tem CORS habilitado, deve funcionar
