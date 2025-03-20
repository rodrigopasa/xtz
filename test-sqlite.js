// Script para testar a conexão SQLite
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('Testando conexão com SQLite...');

// Configurações
const DATA_DIR = process.env.SQLITE_DATA_DIR || './data';
if (!fs.existsSync(DATA_DIR)) {
  console.log(`Criando diretório de dados: ${DATA_DIR}`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'elexandria.db');
console.log(`Caminho do banco de dados: ${DB_PATH}`);

try {
  // Inicializar o banco de dados SQLite
  const db = new Database(DB_PATH);
  console.log('Conexão com SQLite estabelecida com sucesso!');
  
  // Testar execução de consulta simples
  const result = db.prepare('SELECT 1 as value').get();
  console.log('Resultado da consulta:', result);
  
  // Verificar tabelas existentes
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tabelas existentes:', tables.map(t => t.name));
  
  // Fechar conexão
  db.close();
  console.log('Conexão fechada com sucesso.');
  
  console.log('✅ Teste de conexão SQLite concluído com sucesso!');
} catch (error) {
  console.error('❌ Erro ao conectar com SQLite:', error.message);
  process.exit(1);
}