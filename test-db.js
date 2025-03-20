// Arquivo para testar a conexão com o banco de dados PostgreSQL
const { Client } = require('pg');

async function testConnection() {
  // Lendo os parâmetros de conexão das variáveis de ambiente
  const config = {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'elexandria'
  };

  console.log('Tentando conectar ao PostgreSQL com configuração:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    // Senha ocultada por segurança
  });

  const client = new Client(config);

  try {
    await client.connect();
    console.log('Conexão bem-sucedida!');
    
    // Testar a execução de uma consulta simples
    const res = await client.query('SELECT NOW()');
    console.log('Resultado da consulta:', res.rows[0]);
    
    await client.end();
    return true;
  } catch (err) {
    console.error('Erro ao conectar ao PostgreSQL:', err);
    return false;
  }
}

// Executar o teste de conexão
testConnection()
  .then(success => {
    if (success) {
      console.log('Teste de conexão concluído com sucesso.');
    } else {
      console.log('Teste de conexão falhou.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Erro no teste de conexão:', err);
    process.exit(1);
  });