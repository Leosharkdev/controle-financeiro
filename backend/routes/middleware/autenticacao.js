const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_2024';

// Middleware para verificar token JWT
const autenticar = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Token não fornecido'
      });
    }

    // Esperado: "Bearer <token>"
    const partes = header.split(' ');
    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      return res.status(401).json({
        sucesso: false,
        erro: 'Formato de token inválido'
      });
    }

    const token = partes[1];

    // Verificar token
    const decodificado = jwt.verify(token, JWT_SECRET);
    req.usuarioId = decodificado.id;
    req.usuarioEmail = decodificado.email;

    next();
  } catch (erro) {
    if (erro instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Token expirado'
      });
    }

    if (erro instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Token inválido'
      });
    }

    return res.status(401).json({
      sucesso: false,
      erro: 'Erro ao verificar token: ' + erro.message
    });
  }
};

module.exports = autenticar;
