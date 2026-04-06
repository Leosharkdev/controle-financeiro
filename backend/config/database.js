const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Detectar se está em produção (usa PostgreSQL) ou desenvolvimento (usa SQLite)
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

let db;

if (isProduction && databaseUrl) {
  // PostgreSQL para produção
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false } // Necessário para Render
  });

  db = {
    run: (sql, params = []) => {
      return pool.query(sql, params);
    },

    get: (sql, params = []) => {
      return pool.query(sql, params).then(result => result.rows[0] || null);
    },

    all: (sql, params = []) => {
      return pool.query(sql, params).then(result => result.rows);
    },

    // Inicializar as tabelas
    initialize: async function () {
      try {
        // Criar tabela de usuários
        await this.run(`
          CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            senha VARCHAR(255) NOT NULL,
            nome VARCHAR(255) NOT NULL,
            verificado BOOLEAN DEFAULT false,
            codigoVerificacao VARCHAR(255),
            expiracaoVerificacao TIMESTAMP,
            dataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Criar tabela de contas
        await this.run(`
          CREATE TABLE IF NOT EXISTS contas (
            id SERIAL PRIMARY KEY,
            usuarioId INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            descricao VARCHAR(255) NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            dataVencimento DATE NOT NULL,
            paga BOOLEAN DEFAULT false,
            repetir BOOLEAN DEFAULT false,
            frequenciaRepetir VARCHAR(50),
            dataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            dataAtualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Criar tabela de histórico de pagamentos
        await this.run(`
          CREATE TABLE IF NOT EXISTS historico (
            id SERIAL PRIMARY KEY,
            contaId INTEGER NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
            dataPagamento DATE NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            dataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        console.log('✅ Banco de dados PostgreSQL inicializado');
      } catch (error) {
        console.error('❌ Erro ao inicializar PostgreSQL:', error);
        throw error;
      }
    }
  };

} else {
  // SQLite para desenvolvimento
  const dbPath = path.join(__dirname, '../../database.db');
  const sqlite3Instance = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Erro ao conectar ao banco SQLite:', err);
    } else {
      console.log('✅ Banco de dados SQLite conectado');
    }
  });

  db = {
    run: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        sqlite3Instance.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve(this);
        });
      });
    },

    get: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        sqlite3Instance.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    },

    all: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        sqlite3Instance.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    },

    // Inicializar as tabelas
    initialize: async function () {
      await this.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          senha TEXT NOT NULL,
          nome TEXT NOT NULL,
          verificado BOOLEAN DEFAULT 0,
          codigoVerificacao TEXT,
          expiracaoVerificacao DATETIME,
          dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS contas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuarioId INTEGER NOT NULL,
          descricao TEXT NOT NULL,
          valor REAL NOT NULL,
          dataVencimento DATE NOT NULL,
          paga BOOLEAN DEFAULT 0,
          repetir BOOLEAN DEFAULT 0,
          frequenciaRepetir TEXT,
          dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
          dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
        )
      `);

      await this.run(`
        CREATE TABLE IF NOT EXISTS historico (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contaId INTEGER NOT NULL,
          dataPagamento DATE NOT NULL,
          valor REAL NOT NULL,
          dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (contaId) REFERENCES contas(id) ON DELETE CASCADE
        )
      `);

      console.log('✅ Tabelas SQLite criadas/verficadas');
    }
  };
}

module.exports = db;
    await this.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        nome TEXT NOT NULL,
        verificado INTEGER DEFAULT 0,
        codigoVerificacao TEXT,
        expiracaoVerificacao DATETIME,
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS contas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuarioId INTEGER NOT NULL DEFAULT 0,
        descricao TEXT NOT NULL,
        valor REAL NOT NULL,
        dataVencimento DATE NOT NULL,
        paga BOOLEAN DEFAULT 0,
        repetir BOOLEAN DEFAULT 0,
        frequenciaRepetir TEXT DEFAULT 'nao',
        dataCriacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        dataAtualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS historico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contaId INTEGER NOT NULL,
        dataPagamento DATE NOT NULL,
        valor REAL NOT NULL,
        FOREIGN KEY (contaId) REFERENCES contas(id) ON DELETE CASCADE
      )
    `);

    const usuariosInfo = await this.all(`PRAGMA table_info(usuarios)`);
    const usuariosCols = usuariosInfo.map(col => col.name);

    if (!usuariosCols.includes('verificado')) {
      await this.run(`ALTER TABLE usuarios ADD COLUMN verificado INTEGER DEFAULT 0`);
    }

    if (!usuariosCols.includes('codigoVerificacao')) {
      await this.run(`ALTER TABLE usuarios ADD COLUMN codigoVerificacao TEXT`);
    }

    if (!usuariosCols.includes('expiracaoVerificacao')) {
      await this.run(`ALTER TABLE usuarios ADD COLUMN expiracaoVerificacao DATETIME`);
    }

    const contasInfo = await this.all(`PRAGMA table_info(contas)`);
    const contasCols = contasInfo.map(col => col.name);

    if (!contasCols.includes('usuarioId')) {
      await this.run(`ALTER TABLE contas ADD COLUMN usuarioId INTEGER NOT NULL DEFAULT 0`);
    }

    console.log('📊 Tabelas do banco inicializadas');
  }
};

module.exports = db;
