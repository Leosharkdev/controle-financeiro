const db = require('../../config/database');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// ===== GERAR RELATÓRIO =====
exports.gerarRelatorio = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;
    const { periodo, formato } = req.query; // periodo: 'mes' ou 'ano', formato: 'excel' ou 'pdf'

    if (!['mes', 'ano'].includes(periodo) || !['excel', 'pdf'].includes(formato)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Parâmetros inválidos. Use periodo=mes|ano e formato=excel|pdf'
      });
    }

    // Determinar período
    const hoje = new Date();
    let dataInicio, dataFim, tituloPeriodo;

    if (periodo === 'mes') {
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
      tituloPeriodo = `${hoje.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`;
    } else {
      dataInicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0];
      dataFim = new Date(hoje.getFullYear(), 11, 31).toISOString().split('T')[0];
      tituloPeriodo = `${hoje.getFullYear()}`;
    }

    // Buscar contas do período
    const contas = await db.all(
      `SELECT c.*, 
              CASE WHEN h.id IS NOT NULL THEN 1 ELSE 0 END as foiPaga,
              h.dataPagamento
       FROM contas c
       LEFT JOIN historico h ON c.id = h.contaId
       WHERE c.usuarioId = ? AND c.dataVencimento BETWEEN ? AND ?
       ORDER BY c.dataVencimento ASC`,
      [usuarioId, dataInicio, dataFim]
    );

    // Calcular estatísticas
    const totalContas = contas.length;
    const contasPagas = contas.filter(c => c.foiPaga);
    const contasPendentes = contas.filter(c => !c.foiPaga);
    const valorTotal = contas.reduce((acc, c) => acc + c.valor, 0);
    const valorPago = contasPagas.reduce((acc, c) => acc + c.valor, 0);
    const valorPendente = valorTotal - valorPago;

    if (formato === 'excel') {
      await gerarExcel(res, contas, tituloPeriodo, {
        totalContas,
        contasPagas: contasPagas.length,
        contasPendentes: contasPendentes.length,
        valorTotal,
        valorPago,
        valorPendente
      });
    } else {
      await gerarPDF(res, contas, tituloPeriodo, {
        totalContas,
        contasPagas: contasPagas.length,
        contasPendentes: contasPendentes.length,
        valorTotal,
        valorPago,
        valorPendente
      });
    }

  } catch (erro) {
    console.error('Erro ao gerar relatório:', erro);
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
};

// Função auxiliar para gerar Excel
async function gerarExcel(res, contas, tituloPeriodo, stats) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Controle Financeiro';
  workbook.created = new Date();

  // Planilha principal
  const worksheet = workbook.addWorksheet('Relatório Financeiro');

  // Título
  worksheet.mergeCells('A1:F1');
  const tituloCell = worksheet.getCell('A1');
  tituloCell.value = `Relatório Financeiro - ${tituloPeriodo}`;
  tituloCell.font = { size: 16, bold: true };
  tituloCell.alignment = { horizontal: 'center' };

  // Estatísticas
  worksheet.getCell('A3').value = 'Estatísticas Gerais';
  worksheet.getCell('A3').font = { bold: true };

  worksheet.getCell('A4').value = 'Total de Contas:';
  worksheet.getCell('B4').value = stats.totalContas;

  worksheet.getCell('A5').value = 'Contas Pagas:';
  worksheet.getCell('B5').value = stats.contasPagas;

  worksheet.getCell('A6').value = 'Contas Pendentes:';
  worksheet.getCell('B6').value = stats.contasPendentes;

  worksheet.getCell('A7').value = 'Valor Total:';
  worksheet.getCell('B7').value = `R$ ${stats.valorTotal.toFixed(2)}`;

  worksheet.getCell('A8').value = 'Valor Pago:';
  worksheet.getCell('B8').value = `R$ ${stats.valorPago.toFixed(2)}`;

  worksheet.getCell('A9').value = 'Valor Pendente:';
  worksheet.getCell('B9').value = `R$ ${stats.valorPendente.toFixed(2)}`;

  // Cabeçalhos da tabela
  worksheet.getCell('A11').value = 'Descrição';
  worksheet.getCell('B11').value = 'Valor';
  worksheet.getCell('C11').value = 'Vencimento';
  worksheet.getCell('D11').value = 'Status';
  worksheet.getCell('E11').value = 'Data Pagamento';

  const headerRow = worksheet.getRow(11);
  headerRow.font = { bold: true };
  headerRow.eachCell(cell => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Dados das contas
  contas.forEach((conta, index) => {
    const row = worksheet.getRow(12 + index);
    row.getCell(1).value = conta.descricao;
    row.getCell(2).value = conta.valor;
    row.getCell(3).value = new Date(conta.dataVencimento).toLocaleDateString('pt-BR');
    row.getCell(4).value = conta.foiPaga ? 'Paga' : 'Pendente';
    row.getCell(5).value = conta.dataPagamento ? new Date(conta.dataPagamento).toLocaleDateString('pt-BR') : '-';

    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Auto-ajustar colunas
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  // Configurar resposta
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=relatorio-financeiro-${tituloPeriodo.replace(/\s+/g, '-').toLowerCase()}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
}

// Função auxiliar para gerar PDF
async function gerarPDF(res, contas, tituloPeriodo, stats) {
  const doc = new PDFDocument();
  const filename = `relatorio-financeiro-${tituloPeriodo.replace(/\s+/g, '-').toLowerCase()}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

  doc.pipe(res);

  // Título
  doc.fontSize(20).text(`Relatório Financeiro - ${tituloPeriodo}`, { align: 'center' });
  doc.moveDown(2);

  // Estatísticas
  doc.fontSize(14).text('Estatísticas Gerais', { underline: true });
  doc.moveDown(0.5);

  doc.fontSize(12)
    .text(`Total de Contas: ${stats.totalContas}`)
    .text(`Contas Pagas: ${stats.contasPagas}`)
    .text(`Contas Pendentes: ${stats.contasPendentes}`)
    .text(`Valor Total: R$ ${stats.valorTotal.toFixed(2)}`)
    .text(`Valor Pago: R$ ${stats.valorPago.toFixed(2)}`)
    .text(`Valor Pendente: R$ ${stats.valorPendente.toFixed(2)}`);

  doc.moveDown(2);

  // Tabela de contas
  doc.fontSize(14).text('Detalhes das Contas', { underline: true });
  doc.moveDown(0.5);

  // Cabeçalhos
  const tableTop = doc.y;
  doc.fontSize(10)
    .text('Descrição', 50, tableTop)
    .text('Valor', 250, tableTop)
    .text('Vencimento', 320, tableTop)
    .text('Status', 420, tableTop);

  doc.moveDown(0.5);

  // Linha separadora
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);

  // Dados
  contas.forEach(conta => {
    const y = doc.y;
    doc.fontSize(9)
      .text(conta.descricao.substring(0, 25), 50, y, { width: 190 })
      .text(`R$ ${conta.valor.toFixed(2)}`, 250, y, { width: 60 })
      .text(new Date(conta.dataVencimento).toLocaleDateString('pt-BR'), 320, y, { width: 80 })
      .text(conta.foiPaga ? 'Paga' : 'Pendente', 420, y, { width: 60 });

    doc.moveDown(0.8);

    // Quebrar página se necessário
    if (doc.y > 700) {
      doc.addPage();
    }
  });

  // Rodapé
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).text(
      `Relatório gerado em ${new Date().toLocaleString('pt-BR')} - Página ${i + 1} de ${pageCount}`,
      50,
      doc.page.height - 50,
      { align: 'center', width: doc.page.width - 100 }
    );
  }

  doc.end();
}

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
