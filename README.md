# 💰 Controle Financeiro - Aplicação Completa

Uma aplicação web moderna para gerenciar suas contas e despesas com funcionalidades intuitivas e visuais.

## 🎯 Funcionalidades

✅ **1. Inserir Conta com Repetição**
- Ao adicionar uma conta, selecione se ela se repete
- Escolha a frequência: semanal, quinzenal, mensal, trimestral, semestral ou anual

✅ **2. Validade das Contas**
- Cada conta tem uma data de vencimento configurável

✅ **3. Notificação de Vencimento**
- Receba alertas de contas que vencem AMANHÃ
- Sistema visual com cores diferentes para cada status

✅ **4. Resumo do Mês**
- Total de contas do mês
- Valor total da todas as contas
- Valor já pago
- Valor ainda a pagar
- Percentual de conclusão com barra visual

✅ **5. Edição e Deleção**
- Edite qualquer conta com um clique
- Delete contas de forma segura com confirmação

✅ **6. Marcar como Paga**
- Clique em um botão para marcar como paga
- Histórico automático de pagamentos

## 🏗️ Arquitetura do Projeto

```
controle-financeiro/
├── backend/                      # Servidor Node.js/Express
│   ├── config/
│   │   └── database.js          # Configuração SQLite
│   ├── routes/
│   │   ├── index.js             # Definição de rotas
│   │   └── controllers/
│   │       └── contasController.js  # Lógica das operações
│   └── index.js                 # Arquivo principal do servidor
├── frontend/                     # Aplicação React
│   ├── public/
│   │   └── index.html           # HTML base
│   ├── src/
│   │   ├── index.js             # Ponto de entrada do React
│   │   ├── index.css            # Estilos globais
│   │   ├── App.js               # Componente principal
│   │   └── App.css              # Estilos da aplicação
│   └── package.json             # Dependências do frontend
├── database.db                   # Banco de dados SQLite (criado automaticamente)
├── package.json                  # Dependências do projeto raiz
└── README.md                     # Este arquivo
```

## 🚀 Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v14+)
- Terminal/CMD

### Instalação

1. **Instale as dependências do projeto raiz:**
   ```bash
   npm install
   ```

2. **Instale as dependências do frontend:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Rodar a Aplicação

**Opção 1: Rodar backend e frontend simultaneamente (recomendado)**
```bash
npm run dev
```

**Opção 2: Rodar apenas o backend**
```bash
npm run server
```
Acesse em: `http://localhost:5000/api/health`

**Opção 3: Rodar apenas o frontend**
```bash
npm run client
```
Acesse em: `http://localhost:3000`

## ☁️ Deploy Online

### 1. Backend público

O backend está pronto para rodar em qualquer serviço Node.js compatível:
- Render
- Railway
- Fly.io
- Heroku
- Azure App Service

Use a raiz do projeto para deploy. Defina as variáveis de ambiente:
- `PORT` (opcional)
- `JWT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `BACKEND_URL` (URL pública do seu backend, usada para links de verificação)

Exemplo de rotas públicas:
- `https://seu-backend.com/api/usuarios/registrar`
- `https://seu-backend.com/api/usuarios/login`

Para deploy em um container:
- `Dockerfile` já incluído
- `Procfile` já incluído
- `.dockerignore` já incluído

Exemplo Docker:
```bash
docker build -t controle-financeiro .
docker run -p 5000:5000 --env-file .env controle-financeiro
```

### 2. Frontend no Vercel

O frontend é uma aplicação React criada com Create React App.

1. Crie um projeto no Vercel e selecione a pasta `frontend`.
2. Defina a variável de ambiente em Vercel:
   - `REACT_APP_API_BASE_URL=https://seu-backend.com/api`
3. Execute o build com `npm run build` automaticamente pelo Vercel.
4. Use `frontend/vercel.json` para roteamento de SPA.

### 3. Fluxo de produção

- Usuário acessa o frontend hospedado no Vercel
- Frontend chama o backend público usando `REACT_APP_API_BASE_URL`
- Backend usa SMTP para enviar e-mails de confirmação
- Se o backend estiver ativo e `EMAIL_*` configurado, o sistema funciona online

## 📚 Entendendo o Código

### Backend - Express.js

#### 1. **Arquivo Principal: `backend/index.js`**
```javascript
// Define o servidor Express
// Importa middleware (CORS, bodyParser)
// Inicializa o banco de dados
// Define a porta (padrão: 5000)
```

#### 2. **Banco de Dados: `backend/config/database.js`**
- Usa SQLite para armazenamento local
- Cria automaticamente as tabelas:
  - `contas`: Armazena as contas financeiras
  - `historico`: Rastreia os pagamentos realizados

#### 3. **Rotas: `backend/routes/index.js`**
Define os endpoints da API:
```
GET  /api/contas                  - Lista todas as contas
POST /api/contas                  - Cria nova conta
PUT  /api/contas/:id              - Atualiza uma conta
DELETE /api/contas/:id            - Deleta uma conta
POST /api/contas/:id/pagar        - Marca como paga
GET  /api/resumo-mes              - Resumo do mês atual
GET  /api/proximos-vencimentos    - Próximos vencimentos
GET  /api/historico               - Histórico de pagamentos
```

#### 4. **Controller: `backend/routes/controllers/contasController.js`**
Contém toda a lógica de negócio:
- Validações
- Operações CRUD (Create, Read, Update, Delete)
- Cálculos de resumo
- Filtros de vencimentos

### Frontend - React.js

#### 1. **Arquivo Principal: `frontend/src/App.js`**
- Gerencia o estado global com `useState`
- Faz requisições à API com `axios`
- Renderiza todos os componentes

#### 2. **Estados Principais:**
```javascript
const [contas, setContas] = useState([]);           // Lista de contas
const [resumoMes, setResumoMes] = useState(null); // Dados do mês
const [proximosVencimentos, setProximosVencimentos] = useState(null);
const [mostrarModal, setMostrarModal] = useState(false);
const [formulario, setFormulario] = useState({
  descricao: '',
  valor: '',
  dataVencimento: '',
  repetir: false,
  frequenciaRepetir: 'mensal'
});
```

#### 3. **Componentes:**

**CartaoConta** - Renderiza cada conta como um card
```javascript
function CartaoConta({ conta, status, onEditar, onDeletar, onMarcarPaga }) {
  // Mostra descrição, valor, data
  // Botões de Editar, Deletar, Marcar como Paga
}
```

#### 4. **Requisições à API:**
```javascript
// Listar contas
api.get('/contas')

// Criar conta
api.post('/contas', { descricao, valor, dataVencimento, ... })

// Atualizar conta
api.put(`/contas/${id}`, { ... })

// Deletar conta
api.delete(`/contas/${id}`)

// Marcar como paga
api.post(`/contas/${id}/pagar`)
```

## 🎨 Estilo e Design

- **Cores principais:**
  - Púrpura: `#667eea` - Cor primária (botões, destaques)
  - Verde: `#48bb78` - Sucesso
  - Laranja: `#f6ad55` - Alerta
  - Vermelho: `#f56565` - Erro

- **Componentes de UI:**
  - Cards com sombras e hover effects
  - Modal/formulário para adicionar/editar contas
  - Alertas coloridos para diferentes tipos de mensagens
  - Barra de progresso para visualizar pagamentos do mês
  - Cards de status com cores diferentes

## 🔄 Fluxo de Dados

1. **Usuário clica em "+ Nova Conta"**
   ↓
2. **Modal abre com formulário**
   ↓
3. **Usuário preenche os dados e clica em "Salvar"**
   ↓
4. **Frontend envia POST para `/api/contas`**
   ↓
5. **Backend valida e insere no banco SQLite**
   ↓
6. **Backend retorna a conta criada**
   ↓
7. **Frontend atualiza a lista e mostra mensagem de sucesso**
   ↓
8. **Dados são renderizados no layout**

## 📊 Exemplo de Dados

### Conta no Banco de Dados:
```json
{
  "id": 1,
  "descricao": "Internet",
  "valor": 99.90,
  "dataVencimento": "2026-04-15",
  "paga": 0,
  "repetir": 1,
  "frequenciaRepetir": "mensal",
  "dataCriacao": "2026-04-06T10:00:00",
  "dataAtualizacao": "2026-04-06T10:00:00"
}
```

## 🔍 Dicas de Desenvolvimento

### Para adicionar nova funcionalidade no backend:
1. Crie a função no `contasController.js`
2. Defina a rota em `routes/index.js`
3. Teste via Postman ou curl

### Para adicionar novo componente no frontend:
1. Crie a função React
2. Use `useState` para gerenciar estado local
3. Use `api` de axios para chamadas HTTP
4. Estilize com classes CSS em `App.css` e `index.css`

### Para debugar:
- **Backend**: Verifique o console do Node.js
- **Frontend**: Abra DevTools (F12) no navegador
- **Banco de dados**: Use ferramentas como SQLiteStudio

## 📝 Pontos de Aprendizado

Este projeto ensina:
- ✅ React Hooks (useState, useEffect)
- ✅ Requisições HTTP com axios
- ✅ Express.js e routing
- ✅ SQLite e SQL básico
- ✅ CRUD operations
- ✅ Modal e Formulários
- ✅ Responsive Design com CSS Grid e Flexbox
- ✅ Tratamento de erros e validações
- ✅ State management
- ✅ Componentização em React

## 🐛 Troubleshooting

**"Port 5000 já está em uso"**
- Mude a porta em `backend/index.js`: `const PORT = 3001;`

**"Módulo não encontrado"**
- Rodeia `npm install` novamente

**"CORS error"**
- Verifique se o backend está rodando em `http://localhost:5000`

**"Banco de dados não foi criado"**
- O SQLite cria automaticamente. Cheque permissões da pasta

## 📞 Suporte

Para dúvidas sobre o código, consulte os comentários nas funções ou a seção "Entendendo o Código" acima.

---

**Desenvolvido com ❤️ para aprender**
