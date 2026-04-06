const db = require('../../config/database');

// ===== LISTAR TODAS AS CONTAS =====
exports.listarContas = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const contas = await db.all(
      `SELECT * FROM contas WHERE usuarioId = ? ORDER BY dataVencimento ASC`,
      [usuarioId]
    );
    res.json({
      sucesso: true,
      total: contas.length,
      dados: contas
    });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
};

// ===== OBTER UMA CONTA ESPECÍFICA =====
exports.obterConta = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuarioId;
    const conta = await db.get(
      `SELECT * FROM contas WHERE id = ? AND usuarioId = ?`,
      [id, usuarioId]
    );
    
    if (!conta) {
      return res.status(404).json({ sucesso: false, erro: 'Conta não encontrada' });
    }
    
    res.json({ sucesso: true, dados: conta });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
};

// ===== CRIAR NOVA CONTA =====
exports.criarConta = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { descricao, valor, dataVencimento, repetir, frequenciaRepetir } = req.body;

    // Validar dados
    if (!descricao || !valor || !dataVencimento) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Descrição, valor e data de vencimento são obrigatórios'
      });
    }

    const novaFrequencia = repetir ? (frequenciaRepetir || 'mensal') : 'nao';

    const resultado = await db.run(
      `INSERT INTO contas (usuarioId, descricao, valor, dataVencimento, repetir, frequenciaRepetir)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuarioId, descricao, parseFloat(valor), dataVencimento, repetir ? 1 : 0, novaFrequencia]
    );

    // Buscar a conta criada
    const contaCriada = await db.get(
      `SELECT * FROM contas WHERE id = ?`,
      [resultado.lastID]
    );

    res.status(201).json({
      sucesso: true,
      mensagem: '✅ Conta criada com sucesso!',
      dados: contaCriada
    });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
};

// ===== ATUALIZAR CONTA =====
exports.atualizarConta = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuarioId;
    const { descricao, valor, dataVencimento, repetir, frequenciaRepetir, paga } = req.body;

    // Verificar se conta existe
    const contaExiste = await db.get(`SELECT * FROM contas WHERE id = ? AND usuarioId = ?`, [id, usuarioId]);
    if (!contaExiste) {
      return res.status(404).json({ sucesso: false, erro: 'Conta não encontrada' });
    }

    const novaFrequencia = repetir ? (frequenciaRepetir || 'mensal') : 'nao';

    await db.run(
      `UPDATE contas 
       SET descricao = ?, valor = ?, dataVencimento = ?, repetir = ?, frequenciaRepetir = ?, paga = ?,
           dataAtualizacao = CURRENT_TIMESTAMP
       WHERE id = ? AND usuarioId = ?`,
      [
        descricao || contaExiste.descricao,
        valor !== undefined ? parseFloat(valor) : contaExiste.valor,
        dataVencimento || contaExiste.dataVencimento,
        repetir !== undefined ? (repetir ? 1 : 0) : contaExiste.repetir,
        novaFrequencia,
        paga !== undefined ? (paga ? 1 : 0) : contaExiste.paga,
        id,
        usuarioId
      ]
    );

    const contaAtualizada = await db.get(`SELECT * FROM contas WHERE id = ? AND usuarioId = ?`, [id, usuarioId]);

    res.json({
      sucesso: true,
      mensagem: '✅ Conta atualizada com sucesso!',
      dados: contaAtualizada
    });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
};

// ===== DELETAR CONTA =====
exports.deletarConta = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuarioId;

    const contaExiste = await db.get(`SELECT * FROM contas WHERE id = ? AND usuarioId = ?`, [id, usuarioId]);
    if (!contaExiste) {
      return res.status(404).json({ sucesso: false, erro: 'Conta não encontrada' });
    }

    await db.run(`DELETE FROM contas WHERE id = ? AND usuarioId = ?`, [id, usuarioId]);

    res.json({
      sucesso: true,
      mensagem: '✅ Conta deletada com sucesso!'
    });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
};

// ===== MARCAR COMO PAGA =====
exports.marcarComoPaga = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuarioId;
    const { data } = req.body;

    const contaExiste = await db.get(`SELECT * FROM contas WHERE id = ? AND usuarioId = ?`, [id, usuarioId]);
    if (!contaExiste) {
      return res.status(404).json({ sucesso: false, erro: 'Conta não encontrada' });
    }

    const dataPagamento = data || new Date().toISOString().split('T')[0];

    // Registrar no histórico
    await db.run(
      `INSERT INTO historico (contaId, dataPagamento, valor)
       VALUES (?, ?, ?)`,
      [id, dataPagamento, contaExiste.valor]
    );

    // Marcar conta como paga
    await db.run(
      `UPDATE contas SET paga = 1, dataAtualizacao = CURRENT_TIMESTAMP WHERE id = ? AND usuarioId = ?`,
      [id, usuarioId]
    );

    const contaAtualizada = await db.get(`SELECT * FROM contas WHERE id = ? AND usuarioId = ?`, [id, usuarioId]);

    res.json({
      sucesso: true,
      mensagem: '✅ Conta marcada como paga!',
      dados: contaAtualizada
    });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
};

// ===== RESUMO DO MÊS =====
exports.resumoMes = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM

    const contas = await db.all(
      `SELECT * FROM contas 
       WHERE usuarioId = ? AND strftime('%Y-%m', dataVencimento) = ?
       ORDER BY dataVencimento ASC`,
      [usuarioId, mesAtual]
    );

    const totalContas = contas.reduce((acc, conta) => acc + conta.valor, 0);
    const totalPago = contas
      .filter(c => c.paga)
      .reduce((acc, conta) => acc + conta.valor, 0);
    const totalAberto = totalContas - totalPago;

    res.json({
      sucesso: true,
      mes: mesAtual,
      total: contas.length,
      totalValor: parseFloat(totalContas.toFixed(2)),
      totalPago: parseFloat(totalPago.toFixed(2)),
      totalAberto: parseFloat(totalAberto.toFixed(2)),
      percentualPago: contas.length > 0 ? parseFloat((totalPago / totalContas * 100).toFixed(2)) : 0,
      contas
    });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
};

// ===== PRÓXIMOS VENCIMENTOS =====
exports.proximosVencimentos = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const hoje = new Date();
    const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const seteDiasAdiante = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const dataHoje = hoje.toISOString().split('T')[0];

    const contas = await db.all(
      `SELECT * FROM contas 
       WHERE usuarioId = ? AND dataVencimento BETWEEN ? AND ?
       AND paga = 0
       ORDER BY dataVencimento ASC`,
      [usuarioId, seteDiasAtras, seteDiasAdiante]
    );

    // Separar contas por status
    const vencidas = contas.filter(c => c.dataVencimento < dataHoje);
    const vencenteHoje = contas.filter(c => c.dataVencimento === dataHoje);
    const vencemAmanha = contas.filter(c => {
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      const dataAmanha = amanha.toISOString().split('T')[0];
      return c.dataVencimento === dataAmanha;
    });
    const proximasContas = contas.filter(
      c => c.dataVencimento > dataHoje && !vencemAmanha.includes(c)
    );

    res.json({
      sucesso: true,
      dataHoje,
      vencidas: {
        total: vencidas.length,
        valor: parseFloat(vencidas.reduce((acc, c) => acc + c.valor, 0).toFixed(2)),
        contas: vencidas
      },
      vencenteHoje: {
        total: vencenteHoje.length,
        valor: parseFloat(vencenteHoje.reduce((acc, c) => acc + c.valor, 0).toFixed(2)),
        contas: vencenteHoje
      },
      vencemAmanha: {
        total: vencemAmanha.length,
        valor: parseFloat(vencemAmanha.reduce((acc, c) => acc + c.valor, 0).toFixed(2)),
        contas: vencemAmanha,
        aviso: '⚠️ Estas contas vencem amanhã!'
      },
      proximasSeteDias: {
        total: proximasContas.length,
        valor: parseFloat(proximasContas.reduce((acc, c) => acc + c.valor, 0).toFixed(2)),
        contas: proximasContas
      }
    });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
};

// ===== HISTÓRICO DE PAGAMENTOS =====
exports.obterHistorico = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const historico = await db.all(
      `SELECT h.*, c.descricao 
       FROM historico h
       JOIN contas c ON h.contaId = c.id
       WHERE c.usuarioId = ?
       ORDER BY h.dataPagamento DESC`,
      [usuarioId]
    );

    res.json({
      sucesso: true,
      total: historico.length,
      dados: historico
    });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
};
