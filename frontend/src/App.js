import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Login from './Login';

// Serviço de API
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'
});

// Interceptador para adicionar token em todas as resquisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  // ===== ESTADOS =====
  const [usuario, setUsuario] = useState(null);
  const [contas, setContas] = useState([]);
  const [resumoMes, setResumoMes] = useState(null);
  const [proximosVencimentos, setProximosVencimentos] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucessoMensagem, setSucessoMensagem] = useState(null);

  // Modal e Formulário
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState({
    descricao: '',
    valor: '',
    dataVencimento: '',
    diaVencimento: '',
    repetir: false,
    frequenciaRepetir: 'mensal'
  });

  // Modal de Relatórios
  const [mostrarModalRelatorio, setMostrarModalRelatorio] = useState(false);
  const [formularioRelatorio, setFormularioRelatorio] = useState({
    periodo: 'mes',
    formato: 'excel'
  });

  // ===== VERIFICAR SE ESTÁ LOGADO =====
  useEffect(() => {
    const verificarAutenticacao = async () => {
      const token = localStorage.getItem('token');
      const usuarioArmazenado = localStorage.getItem('usuario');

      if (token && usuarioArmazenado) {
        try {
          const resposta = await api.get('/users/validar');
          if (resposta.data.sucesso) {
            setUsuario(resposta.data.usuario);
            carregarDados();
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
          }
        } catch (err) {
          console.error('Erro ao validar token:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
        }
      }
    };

    verificarAutenticacao();
  }, []);

  // ===== LIFECYCLE =====
  useEffect(() => {
    if (!usuario) return;

    carregarDados();
    // Recarregar dados a cada 60 segundos para sincronizar
    const intervalo = setInterval(carregarDados, 60000);
    return () => clearInterval(intervalo);
  }, [usuario]);

  // ===== FUNÇÕES DE API =====
  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [contasRes, resumoRes, vencimentosRes] = await Promise.all([
        api.get('/contas'),
        api.get('/resumo-mes'),
        api.get('/proximos-vencimentos')
      ]);

      setContas(contasRes.data.dados);
      setResumoMes(resumoRes.data);
      setProximosVencimentos(vencimentosRes.data);
      setErro(null);
    } catch (err) {
      setErro('❌ Erro ao carregar dados: ' + err.message);
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const calcularDataVencimento = (dia) => {
    if (!dia || dia < 1 || dia > 31) return '';

    const hoje = new Date();
    let data = new Date(hoje.getFullYear(), hoje.getMonth(), dia);

    // Se o dia já passou neste mês, vai para o próximo mês
    if (data < hoje) {
      data = new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia);
    }

    // Formatar para YYYY-MM-DD
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const diaFormatado = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${diaFormatado}`;
  };

  const handleMudarDiaVencimento = (e) => {
    const dia = e.target.value;
    const dataCalculada = calcularDataVencimento(dia);
    
    setFormulario(prev => ({
      ...prev,
      dataVencimento: dataCalculada,
      diaVencimento: dia
    }));
  };

  const handleMudarFormulario = (e) => {
    const { name, value, type, checked } = e.target;
    setFormulario(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmeterFormulario = async (e) => {
    e.preventDefault();

    if (!formulario.descricao || !formulario.valor || !formulario.dataVencimento) {
      setErro('⚠️ Preecha todos os campos obrigatórios');
      return;
    }

    try {
      setCarregando(true);

      if (editandoId) {
        // Atualizar conta existente
        await api.put(`/contas/${editandoId}`, formulario);
        setSucessoMensagem('✅ Conta atualizada com sucesso!');
      } else {
        // Criar nova conta
        await api.post('/contas', formulario);
        setSucessoMensagem('✅ Conta criada com sucesso!');
      }

      limparFormulario();
      setMostrarModal(false);
      await carregarDados();

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSucessoMensagem(null), 3000);
    } catch (err) {
      setErro('❌ Erro: ' + err.response?.data?.erro || err.message);
    } finally {
      setCarregando(false);
    }
  };

  const handleEditarConta = (conta) => {
    const data = new Date(conta.dataVencimento);
    const dia = data.getDate();

    setEditandoId(conta.id);
    setFormulario({
      descricao: conta.descricao,
      valor: conta.valor,
      dataVencimento: conta.dataVencimento,
      diaVencimento: String(dia),
      repetir: conta.repetir === 1,
      frequenciaRepetir: conta.frequenciaRepetir
    });
    setMostrarModal(true);
  };

  const handleDeletarConta = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar esta conta?')) {
      try {
        setCarregando(true);
        await api.delete(`/contas/${id}`);
        setSucessoMensagem('✅ Conta deletada com sucesso!');
        await carregarDados();
        setTimeout(() => setSucessoMensagem(null), 3000);
      } catch (err) {
        setErro('❌ Erro ao deletar conta: ' + err.message);
      } finally {
        setCarregando(false);
      }
    }
  };

  const handleMarcarComoPaga = async (id) => {
    try {
      setCarregando(true);
      await api.post(`/contas/${id}/pagar`);
      setSucessoMensagem('✅ Conta marcada como paga!');
      await carregarDados();
      setTimeout(() => setSucessoMensagem(null), 3000);
    } catch (err) {
      setErro('❌ Erro ao marcar como paga: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const limparFormulario = () => {
    setEditandoId(null);
    setFormulario({
      descricao: '',
      valor: '',
      dataVencimento: '',
      diaVencimento: '',
      repetir: false,
      frequenciaRepetir: 'mensal'
    });
  };

  const handleLoginSucesso = (usuarioData) => {
    setUsuario(usuarioData);
    carregarDados();
  };

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja fazer logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      setUsuario(null);
      setContas([]);
      setResumoMes(null);
      setProximosVencimentos(null);
    }
  };

  const handleGerarRelatorio = async () => {
    try {
      setCarregando(true);
      const { periodo, formato } = formularioRelatorio;
      
      const response = await api.get('/relatorio', {
        params: { periodo, formato },
        responseType: 'blob' // Para downloads de arquivo
      });

      // Criar link para download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const extensao = formato === 'excel' ? 'xlsx' : 'pdf';
      const periodoNome = periodo === 'mes' ? 'mensal' : 'anual';
      link.setAttribute('download', `relatorio-financeiro-${periodoNome}.${extensao}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMostrarModalRelatorio(false);
      setSucessoMensagem('✅ Relatório gerado com sucesso!');
      setTimeout(() => setSucessoMensagem(null), 3000);
    } catch (err) {
      setErro('❌ Erro ao gerar relatório: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const fecharModal = () => {
    setMostrarModal(false);
    limparFormulario();
  };

  const fecharModalRelatorio = () => {
    setMostrarModalRelatorio(false);
    setFormularioRelatorio({
      periodo: 'mes',
      formato: 'excel'
    });
  };

  // ===== RENDERIZAÇÃO =====
  
  // Se não está logado, mostrar tela de login
  if (!usuario) {
    return <Login onLoginSucesso={handleLoginSucesso} />;
  }

  // Caso contrário, mostrar app principal
  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="container flex-between">
          <h1>💰 Controle Financeiro</h1>
          <div className="header-actions" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#718096' }}>Logado como</div>
              <div style={{ fontWeight: 'bold', color: '#2d3748' }}>{usuario.nome}</div>
            </div>
            <button className="btn btn-secundario" onClick={() => setMostrarModalRelatorio(true)} disabled={carregando}>
              📊 Relatórios
            </button>
            <button className="btn btn-primaria" onClick={() => setMostrarModal(true)} disabled={carregando}>
              + Nova Conta
            </button>
            <button className="btn btn-secundario btn-pequeno" onClick={handleLogout}>
              🚪 Sair
            </button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="main">
        <div className="container">
          {/* MENSAGENS */}
          {erro && <div className="alerta alerta-erro">{erro}</div>}
          {sucessoMensagem && <div className="alerta alerta-sucesso">{sucessoMensagem}</div>}

          {/* NOTIFICAÇÕES DE VENCIMENTO */}
          {proximosVencimentos?.vencemAmanha?.contas?.length > 0 && (
            <div className="alerta alerta-alerta">
              <span>⚠️</span>
              <div>
                <strong>Atenção!</strong> Você tem {proximosVencimentos.vencemAmanha.contas.length} conta(s) vencendo amanhã!
              </div>
            </div>
          )}

          {/* FILTRO SIMPLES */}
          <div className="secao-filtros">
            <button
              className="btn btn-secundario btn-pequeno"
              onClick={() => {
                // Mostrar tudo
                carregarDados();
              }}
            >
              Todas as Contas
            </button>
          </div>

          {/* RESUMO DO MÊS */}
          {resumoMes && (
            <section className="secao-resumo">
              <h2>📊 Resumo do Mês de {resumoMes.mes}</h2>
              <div className="grid grid-3">
                <div className="card card-stats">
                  <div className="stats-label">Total de Contas</div>
                  <div className="stats-valor">{resumoMes.total}</div>
                </div>
                <div className="card card-stats">
                  <div className="stats-label">Valor Total</div>
                  <div className="stats-valor">R$ {resumoMes.totalValor.toFixed(2)}</div>
                </div>
                <div className="card card-stats">
                  <div className="stats-label">Pago</div>
                  <div className="stats-valor" style={{ color: 'var(--cor-sucesso)' }}>
                    R$ {resumoMes.totalPago.toFixed(2)}
                  </div>
                  <div className="stats-percentual">{resumoMes.percentualPago}% pago</div>
                </div>
                <div className="card card-stats">
                  <div className="stats-label">Falta Pagar</div>
                  <div className="stats-valor" style={{ color: 'var(--cor-alerta)' }}>
                    R$ {resumoMes.totalAberto.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* BARRA DE PROGRESSO */}
              <div className="progresso-container">
                <div className="progresso-label">Progresso do Mês</div>
                <div className="progresso-barra">
                  <div
                    className="progresso-preenchido"
                    style={{
                      width: `${resumoMes.percentualPago}%`,
                      backgroundColor: resumoMes.percentualPago === 100 ? 'var(--cor-sucesso)' : 'var(--cor-primaria)'
                    }}
                  ></div>
                </div>
                <div className="progresso-texto">{resumoMes.percentualPago}%</div>
              </div>
            </section>
          )}

          {/* PRÓXIMOS VENCIMENTOS */}
          {proximosVencimentos && (
            <section className="secao-vencimentos">
              <h2>📅 Próximos Vencimentos</h2>

              {/* VENCIDAS */}
              {proximosVencimentos.vencidas.contas.length > 0 && (
                <div className="subsecao">
                  <h3 className="titulo-alerta">🔴 Vencidas ({proximosVencimentos.vencidas.total})</h3>
                  <div className="grid">
                    {proximosVencimentos.vencidas.contas.map(conta => (
                      <CartaoConta
                        key={conta.id}
                        conta={conta}
                        status="vencida"
                        onEditar={handleEditarConta}
                        onDeletar={handleDeletarConta}
                        onMarcarPaga={handleMarcarComoPaga}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* VENCENDO HOJE */}
              {proximosVencimentos.vencenteHoje.contas.length > 0 && (
                <div className="subsecao">
                  <h3 className="titulo-alerta" style={{ color: 'var(--cor-alerta)' }}>
                    🟡 Vencendo Hoje ({proximosVencimentos.vencenteHoje.total})
                  </h3>
                  <div className="grid">
                    {proximosVencimentos.vencenteHoje.contas.map(conta => (
                      <CartaoConta
                        key={conta.id}
                        conta={conta}
                        status="hoje"
                        onEditar={handleEditarConta}
                        onDeletar={handleDeletarConta}
                        onMarcarPaga={handleMarcarComoPaga}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* VENCENDO AMANHÃ */}
              {proximosVencimentos.vencemAmanha.contas.length > 0 && (
                <div className="subsecao">
                  <h3 className="titulo-alerta" style={{ color: 'var(--cor-primaria)' }}>
                    🔵 Vencendo Amanhã ({proximosVencimentos.vencemAmanha.total})
                  </h3>
                  <div className="grid">
                    {proximosVencimentos.vencemAmanha.contas.map(conta => (
                      <CartaoConta
                        key={conta.id}
                        conta={conta}
                        status="amanha"
                        onEditar={handleEditarConta}
                        onDeletar={handleDeletarConta}
                        onMarcarPaga={handleMarcarComoPaga}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* PRÓXIMAS 7 DIAS */}
              {proximosVencimentos.proximasSeteDias.contas.length > 0 && (
                <div className="subsecao">
                  <h3>⏰ Próximas 7 Dias ({proximosVencimentos.proximasSeteDias.total})</h3>
                  <div className="grid">
                    {proximosVencimentos.proximasSeteDias.contas.map(conta => (
                      <CartaoConta
                        key={conta.id}
                        conta={conta}
                        status="proxima"
                        onEditar={handleEditarConta}
                        onDeletar={handleDeletarConta}
                        onMarcarPaga={handleMarcarComoPaga}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* TODAS AS CONTAS */}
          <section className="secao-contas">
            <h2>📋 Todas as Contas ({contas.length})</h2>
            {contas.length === 0 ? (
              <div className="alerta alerta-info">
                Nenhuma conta registrada. Clique em "+ Nova Conta" para adicionar!
              </div>
            ) : (
              <div className="grid grid-2">
                {contas.map(conta => (
                  <CartaoConta
                    key={conta.id}
                    conta={conta}
                    status={conta.paga ? 'paga' : 'aberta'}
                    onEditar={handleEditarConta}
                    onDeletar={handleDeletarConta}
                    onMarcarPaga={handleMarcarComoPaga}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* MODAL DE FORMULÁRIO */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editandoId ? '✏️ Editar Conta' : '➕ Nova Conta'}</h2>

            <form onSubmit={handleSubmeterFormulario}>
              {/* DESCRIÇÃO */}
              <div className="form-group">
                <label htmlFor="descricao">Descrição da Conta *</label>
                <input
                  type="text"
                  id="descricao"
                  name="descricao"
                  value={formulario.descricao}
                  onChange={handleMudarFormulario}
                  placeholder="Ex: Conta de luz, Internet, etc."
                  required
                />
              </div>

              {/* VALOR */}
              <div className="form-group">
                <label htmlFor="valor">Valor (R$) *</label>
                <input
                  type="number"
                  id="valor"
                  name="valor"
                  value={formulario.valor}
                  onChange={handleMudarFormulario}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              {/* DATA DE VENCIMENTO */}
              <div className="form-group">
                <label htmlFor="diaVencimento">Dia do Vencimento *</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="number"
                      id="diaVencimento"
                      name="diaVencimento"
                      value={formulario.diaVencimento}
                      onChange={handleMudarDiaVencimento}
                      placeholder="Ex: 15"
                      min="1"
                      max="31"
                      required
                      style={{ width: '100%' }}
                    />
                  </div>
                  {formulario.dataVencimento && (
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '4px',
                      fontSize: '14px',
                      minWidth: '140px',
                      textAlign: 'center'
                    }}>
                      📅 {new Date(formulario.dataVencimento).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
                {formulario.diaVencimento && formulario.dataVencimento && (
                  <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                    ℹ️ Data calculada automaticamente
                  </small>
                )}
              </div>

              {/* REPETIÇÃO */}
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="repetir"
                    checked={formulario.repetir}
                    onChange={handleMudarFormulario}
                  />
                  <span>Esta conta se repete?</span>
                </label>
              </div>

              {/* FREQUÊNCIA */}
              {formulario.repetir && (
                <div className="form-group">
                  <label htmlFor="frequenciaRepetir">Frequência</label>
                  <select
                    id="frequenciaRepetir"
                    name="frequenciaRepetir"
                    value={formulario.frequenciaRepetir}
                    onChange={handleMudarFormulario}
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              )}

              {/* BOTÕES */}
              <div className="flex" style={{ marginTop: '30px' }}>
                <button
                  type="submit"
                  className="btn btn-sucesso"
                  disabled={carregando}
                >
                  {carregando ? '⏳ Salvando...' : '💾 Salvar'}
                </button>
                <button
                  type="button"
                  className="btn btn-secundario"
                  onClick={fecharModal}
                  disabled={carregando}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== COMPONENTE DE CARTÃO DA CONTA =====
function CartaoConta({ conta, status, onEditar, onDeletar, onMarcarPaga }) {
  const getStatusColor = () => {
    if (status === 'vencida') return '#f56565';
    if (status === 'hoje') return '#f6ad55';
    if (status === 'amanha') return '#667eea';
    if (status === 'paga') return '#48bb78';
    return '#2d3748';
  };

  const getStatusLabel = () => {
    if (conta.paga) return '✅ Paga';
    if (status === 'vencida') return '🔴 Vencida';
    if (status === 'hoje') return '🟡 Hoje';
    if (status === 'amanha') return '🔵 Amanhã';
    return '📅 Próxima';
  };

  return (
    <div className="card cartao-conta" style={{ borderLeft: `4px solid ${getStatusColor()}` }}>
      <div className="flex-between" style={{ marginBottom: '12px' }}>
        <h3>{conta.descricao}</h3>
        <span className="badge badge-warning">{getStatusLabel()}</span>
      </div>

      <div className="conta-valor">R$ {conta.valor.toFixed(2)}</div>

      <div className="conta-detalhes">
        <div className="detalhe">
          <span className="detalhe-label">📅 Vencimento:</span>
          <span>{new Date(conta.dataVencimento).toLocaleDateString('pt-BR')}</span>
        </div>

        {conta.repetir === 1 && (
          <div className="detalhe">
            <span className="detalhe-label">🔄 Repetição:</span>
            <span>{conta.frequenciaRepetir}</span>
          </div>
        )}
      </div>

      {/* AÇÕES */}
      <div className="flex" style={{ marginTop: '16px', gap: '8px', justifyContent: 'flex-end' }}>
        {!conta.paga && (
          <button
            className="btn btn-sucesso btn-pequeno"
            onClick={() => onMarcarPaga(conta.id)}
            title="Marcar como paga"
          >
            ✓ Pagar
          </button>
        )}
        <button
          className="btn btn-alerta btn-pequeno"
          onClick={() => onEditar(conta)}
          title="Editar conta"
        >
          ✏️ Editar
        </button>
        <button
          className="btn btn-erro btn-pequeno"
          onClick={() => onDeletar(conta.id)}
          title="Deletar conta"
        >
          🗑️ Deletar
        </button>
      </div>
    </div>
  );
}

// ===== MODAL DE RELATÓRIOS =====
{mostrarModalRelatorio && (
  <div className="modal-overlay" onClick={fecharModalRelatorio}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>📊 Gerar Relatório</h2>
        <button className="btn-fechar" onClick={fecharModalRelatorio}>×</button>
      </div>

      <div className="modal-body">
        <form onSubmit={(e) => { e.preventDefault(); handleGerarRelatorio(); }}>
          {/* PERÍODO */}
          <div className="form-group">
            <label htmlFor="periodo">Período *</label>
            <select
              id="periodo"
              name="periodo"
              value={formularioRelatorio.periodo}
              onChange={(e) => setFormularioRelatorio({...formularioRelatorio, periodo: e.target.value})}
              required
            >
              <option value="mes">📅 Mês Atual</option>
              <option value="ano">📆 Ano Atual</option>
            </select>
          </div>

          {/* FORMATO */}
          <div className="form-group">
            <label htmlFor="formato">Formato do Arquivo *</label>
            <select
              id="formato"
              name="formato"
              value={formularioRelatorio.formato}
              onChange={(e) => setFormularioRelatorio({...formularioRelatorio, formato: e.target.value})}
              required
            >
              <option value="excel">📊 Excel (.xlsx)</option>
              <option value="pdf">📄 PDF (.pdf)</option>
            </select>
          </div>

          {/* BOTÕES */}
          <div className="modal-actions">
            <button type="button" className="btn btn-secundario" onClick={fecharModalRelatorio}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primaria" disabled={carregando}>
              {carregando ? '⏳ Gerando...' : '📥 Baixar Relatório'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
)}

export default App;
