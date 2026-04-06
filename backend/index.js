require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./config/database');
const routes = require('./routes');

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Inicializar banco de dados
db.initialize().catch(err => console.error('Erro ao inicializar o banco de dados:', err));

// Rotas da API
app.use('/api', routes);

// Rota de teste
app.get('/health', (req, res) => {
  res.json({ status: 'servidor funcionando ✅' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
