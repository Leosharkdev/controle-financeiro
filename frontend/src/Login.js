import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'
});

function Login({ onLoginSucesso }) {
  const [modo, setModo] = useState('login'); // 'login' ou 'registro'
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucessoMensagem, setSucessoMensagem] = useState(null);
  const [reenvioMensagem, setReenvioMensagem] = useState(null);
  const [formulario, setFormulario] = useState({
    email: '',
    senha: '',
    nome: ''
  });

  const handleMudarFormulario = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmeter = async (e) => {
    e.preventDefault();
    setErro(null);
    setReenvioMensagem(null);

    try {
      setCarregando(true);

      let resposta;

      if (modo === 'login') {
        // Login
        if (!formulario.email || !formulario.senha) {
          setErro('Email e senha são obrigatórios');
          return;
        }

        resposta = await api.post('/users/login', {
          email: formulario.email,
          senha: formulario.senha
        });

        // Salvar token
        localStorage.setItem('token', resposta.data.token);
        localStorage.setItem('usuario', JSON.stringify(resposta.data.usuario));

        // Chamar callback
        onLoginSucesso(resposta.data.usuario);
      } else {
        // Registro
        if (!formulario.email || !formulario.senha || !formulario.nome) {
          setErro('Email, senha e nome são obrigatórios');
          return;
        }

        if (formulario.senha.length < 6) {
          setErro('A senha deve ter no mínimo 6 caracteres');
          return;
        }

        resposta = await api.post('/users/registro', {
          email: formulario.email,
          senha: formulario.senha,
          nome: formulario.nome
        });

        setSucessoMensagem('✅ Conta criada! Verifique seu email para ativar sua conta.');
        setModo('login');
        setFormulario({ email: '', senha: '', nome: '' });
      }
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao processar. Tente novamente.');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const handleReenviarConfirmacao = async () => {
    setErro(null);
    setSucessoMensagem(null);
    setReenvioMensagem(null);

    if (!formulario.email) {
      setErro('Digite o email usado no cadastro para reenviar a confirmação.');
      return;
    }

    try {
      setCarregando(true);
      const resposta = await api.post('/users/reenvio-confirmacao', {
        email: formulario.email
      });
      setReenvioMensagem(resposta.data.mensagem || 'Email de confirmação reenviado.');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao reenviar email. Tente novamente.');
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-titulo">💰 Controle Financeiro</h1>

        <div className="login-tabs">
          <button
            className={`login-tab ${modo === 'login' ? 'ativo' : ''}`}
            onClick={() => {
              setModo('login');
              setErro(null);
              setSucessoMensagem(null);
              setFormulario({ email: '', senha: '', nome: '' });
            }}
          >
            🔐 Login
          </button>
          <button
            className={`login-tab ${modo === 'registro' ? 'ativo' : ''}`}
            onClick={() => {
              setModo('registro');
              setErro(null);
              setSucessoMensagem(null);
              setFormulario({ email: '', senha: '', nome: '' });
            }}
          >
            📝 Criar Conta
          </button>
        </div>

        {erro && (
          <div className="alerta alerta-erro" style={{ marginBottom: '20px' }}>
            {erro}
          </div>
        )}

        {sucessoMensagem && (
          <div className="alerta alerta-sucesso" style={{ marginBottom: '20px' }}>
            {sucessoMensagem}
          </div>
        )}

        {reenvioMensagem && (
          <div className="alerta alerta-sucesso" style={{ marginBottom: '20px' }}>
            {reenvioMensagem}
          </div>
        )}

        <form onSubmit={handleSubmeter}>
          {modo === 'registro' && (
            <div className="form-group">
              <label htmlFor="nome">Nome Completo</label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formulario.nome}
                onChange={handleMudarFormulario}
                placeholder="João Silva"
                disabled={carregando}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formulario.email}
              onChange={handleMudarFormulario}
              placeholder="seu@email.com"
              disabled={carregando}
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha</label>
            <input
              type="password"
              id="senha"
              name="senha"
              value={formulario.senha}
              onChange={handleMudarFormulario}
              placeholder="Mínimo 6 caracteres"
              disabled={carregando}
            />
          </div>

          {modo === 'login' && (
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secundario"
                onClick={handleReenviarConfirmacao}
                disabled={carregando || !formulario.email}
              >
                🔁 Reenviar email de confirmação
              </button>
              <small style={{ color: '#718096' }}>
                Não recebeu o email? Digite seu email acima e clique em reenviar.
              </small>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primaria"
            style={{ width: '100%', marginTop: '20px' }}
            disabled={carregando}
          >
            {carregando ? '⏳ Processando...' : (modo === 'login' ? '🔓 Entrar' : '✅ Criar Conta')}
          </button>
        </form>

        <p className="login-dica">
          {modo === 'login'
            ? 'Não tem conta? Clique em "Criar Conta" acima'
            : 'Já tem conta? Clique em "Login" acima'}
        </p>
      </div>
    </div>
  );
}

export default Login;
