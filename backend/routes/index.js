const express = require('express');
const router = express.Router();
const contasController = require('./controllers/contasController');
const usuariosController = require('./controllers/usuariosController');
const autenticar = require('./middleware/autenticacao');

// ===== ROTAS DE USUÁRIOS (públicas) =====

// Verificação de email
router.get('/users/verificar/:token', usuariosController.verificarConta);

// Reenviar email de confirmação
router.post('/users/reenvio-confirmacao', usuariosController.reenviarConfirmacao);

// Registro
router.post('/users/registro', usuariosController.registro);

// Login
router.post('/users/login', usuariosController.login);

// ===== ROTAS DE USUÁRIOS (autenticadas) =====

// Validar token
router.get('/users/validar', autenticar, usuariosController.validarToken);

// Obter perfil
router.get('/users/perfil', autenticar, usuariosController.obterPerfil);

// ===== ROTAS DE CONTAS (todas autenticadas) =====

// Listar todas as contas do usuário
router.get('/contas', autenticar, contasController.listarContas);

// Pegar uma conta específica
router.get('/contas/:id', autenticar, contasController.obterConta);

// Criar nova conta
router.post('/contas', autenticar, contasController.criarConta);

// Atualizar conta
router.put('/contas/:id', autenticar, contasController.atualizarConta);

// Deletar conta
router.delete('/contas/:id', autenticar, contasController.deletarConta);

// Marcar conta como paga
router.post('/contas/:id/pagar', autenticar, contasController.marcarComoPaga);

// ===== ROTAS DE RESUMO (autenticadas) =====

// Resumo do mês atual
router.get('/resumo-mes', autenticar, contasController.resumoMes);

// Próximos vencimentos (ultimos 7 dias + próximos 7)
router.get('/proximos-vencimentos', autenticar, contasController.proximosVencimentos);

// Histórico de pagamentos
router.get('/historico', autenticar, contasController.obterHistorico);

module.exports = router;
