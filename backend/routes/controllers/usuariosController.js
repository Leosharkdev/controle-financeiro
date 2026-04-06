const db = require('../../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_2024';

// ===== REGISTRO DE NOVO USUÁRIO =====
exports.registro = async (req, res) => {
  try {
    const { email, senha, nome } = req.body;

    // Validar dados
    if (!email || !senha || !nome) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Email, senha e nome são obrigatórios'
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Email inválido'
      });
    }

    // Validar senha (mínimo 6 caracteres)
    if (senha.length < 6) {
      return res.status(400).json({
        sucesso: false,
        erro: 'A senha deve ter no mínimo 6 caracteres'
      });
    }

    // Verificar se email já existe
    const usuarioExistente = await db.get(
      `SELECT id FROM usuarios WHERE email = ?`,
      [email.toLowerCase()]
    );

    if (usuarioExistente) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Email já registrado'
      });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // TEMPORÁRIO: Criar usuário já verificado (sem email)
    const resultado = await db.run(
      `INSERT INTO usuarios (email, senha, nome, verificado)
       VALUES (?, ?, ?, ?)`,
      [email.toLowerCase(), senhaHash, nome, 1] // verificado = 1
    );

    // COMENTADO TEMPORARIAMENTE: await emailService.enviarEmailConfirmacao(email.toLowerCase(), codigoVerificacao, nome);

    res.status(201).json({
      sucesso: true,
      mensagem: 'Conta criada com sucesso! Faça login para começar.'
    });
  } catch (erro) {
    console.error('Erro ao registrar:', erro);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao registrar usuário: ' + erro.message
    });
  }
};

// ===== REENVIAR CONFIRMAÇÃO =====
exports.reenviarConfirmacao = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Email é obrigatório para reenviar a confirmação.'
      });
    }

    const usuario = await db.get(
      `SELECT id, nome, verificado FROM usuarios WHERE email = ?`,
      [email.toLowerCase()]
    );

    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Email não encontrado. Verifique e tente novamente.'
      });
    }

    if (usuario.verificado === 1) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Conta já verificada. Faça login normalmente.'
      });
    }

    const codigoVerificacao = crypto.randomBytes(24).toString('hex');
    const expiracaoVerificacao = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    await db.run(
      `UPDATE usuarios SET codigoVerificacao = ?, expiracaoVerificacao = ? WHERE id = ?`,
      [codigoVerificacao, expiracaoVerificacao, usuario.id]
    );

    await emailService.enviarEmailConfirmacao(email.toLowerCase(), codigoVerificacao, usuario.nome);

    res.json({
      sucesso: true,
      mensagem: 'Email de confirmação reenviado. Verifique sua caixa de entrada.'
    });
  } catch (erro) {
    console.error('Erro ao reenviar confirmação:', erro);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao reenviar email de confirmação: ' + erro.message
    });
  }
};

// ===== LOGIN =====
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validar dados
    if (!email || !senha) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Email e senha são obrigatórios'
      });
    }

    // Buscar usuário
    const usuario = await db.get(
      `SELECT id, email, senha, nome, verificado, expiracaoVerificacao FROM usuarios WHERE email = ?`,
      [email.toLowerCase()]
    );

    if (!usuario) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Email ou senha incorretos'
      });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Email ou senha incorretos'
      });
    }

    if (usuario.verificado !== 1) {
      if (usuario.expiracaoVerificacao && new Date(usuario.expiracaoVerificacao) < new Date()) {
        return res.status(401).json({
          sucesso: false,
          erro: 'Conta expirou antes de confirmar. Registre-se novamente para receber um novo link.'
        });
      }

      return res.status(401).json({
        sucesso: false,
        erro: 'Conta não verificada. Verifique seu email antes de entrar.'
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome
      }
    });
  } catch (erro) {
    console.error('Erro ao fazer login:', erro);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao fazer login: ' + erro.message
    });
  }
};

// ===== VERIFICAR CONTA POR TOKEN =====
exports.verificarConta = async (req, res) => {
  try {
    const { token } = req.params;

    const usuario = await db.get(
      `SELECT id, email, nome, verificado, expiracaoVerificacao FROM usuarios WHERE codigoVerificacao = ?`,
      [token]
    );

    if (!usuario) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Token de verificação inválido ou expirado'
      });
    }

    if (usuario.verificado === 1) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Conta já foi verificada'
      });
    }

    if (new Date(usuario.expiracaoVerificacao) < new Date()) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Token de verificação expirou após 3 dias. Registre-se novamente para receber um novo email de confirmação.'
      });
    }

    await db.run(
      `UPDATE usuarios SET verificado = 1, codigoVerificacao = NULL, expiracaoVerificacao = NULL WHERE id = ?`,
      [usuario.id]
    );

    const novoToken = jwt.sign(
      { id: usuario.id, email: usuario.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      sucesso: true,
      mensagem: 'Conta verificada com sucesso!',
      token: novoToken,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome
      }
    });
  } catch (erro) {
    console.error('Erro ao verificar conta:', erro);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao verificar conta: ' + erro.message
    });
  }
};

// ===== OBTER DADOS DO USUÁRIO =====
exports.obterPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    const usuario = await db.get(
      `SELECT id, email, nome, dataCriacao FROM usuarios WHERE id = ?`,
      [usuarioId]
    );

    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Usuário não encontrado'
      });
    }

    res.json({
      sucesso: true,
      usuario
    });
  } catch (erro) {
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao obter perfil: ' + erro.message
    });
  }
};

// ===== VALIDAR TOKEN =====
exports.validarToken = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    const usuario = await db.get(
      `SELECT id, email, nome FROM usuarios WHERE id = ?`,
      [usuarioId]
    );

    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Usuário não encontrado'
      });
    }

    res.json({
      sucesso: true,
      usuario
    });
  } catch (erro) {
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao validar token: ' + erro.message
    });
  }
};
