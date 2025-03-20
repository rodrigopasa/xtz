// Inicialização do banco de dados SQLite
import { initializeSQLiteDatabase } from './db-sqlite';

console.log('Iniciando configuração do banco de dados SQLite...');

async function initializeDatabase() {
  try {
    // Inicializa o banco de dados SQLite
    const success = await initializeSQLiteDatabase();
    
    if (success) {
      console.log('✅ Banco de dados SQLite inicializado com sucesso!');
      process.exit(0);
    } else {
      console.error('❌ Falha ao inicializar o banco de dados SQLite.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Erro durante a inicialização do banco de dados:', error);
    process.exit(1);
  }
}

// Executa a inicialização
initializeDatabase();