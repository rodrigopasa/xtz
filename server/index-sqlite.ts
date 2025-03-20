// Versão alternativa do arquivo index.ts que usa SQLite
import express, { Request, Response, NextFunction } from 'express';
import { registerRoutes } from './routes-sqlite';
import { setupVite, serveStatic, log } from './vite';
import http from 'http';
import { checkDatabaseHealth } from './db-sqlite';

const app = express();
const server = http.createServer(app);

// Configurar middleware CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Configuração básica do Express
app.use(express.json());

// Verificação periódica da saúde do banco de dados
function startHealthCheck() {
  const checkInterval = parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000');
  
  setInterval(async () => {
    try {
      const healthy = await checkDatabaseHealth();
      log(`Status do banco de dados: { healthy: ${healthy}, timestamp: '${new Date().toISOString()}' }`);
    } catch (error: any) {
      log(`Erro ao verificar a saúde do banco de dados: ${error.message}`);
    }
  }, checkInterval);
}

// Middleware de tratamento de erros
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'production' ? 'Ocorreu um erro inesperado.' : err.message
  });
});

// Inicialização da aplicação
async function init() {
  try {
    // Configurar Vite em modo de desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Registrar as rotas
    await registerRoutes(app);

    // Iniciar o servidor
    const PORT = process.env.PORT || 5000;
    const HOST = process.env.HOST || 'localhost';
    
    server.listen(PORT, HOST as string, () => {
      log(`Servidor rodando em http://${HOST}:${PORT}`, 'server');
      
      // Iniciar verificação de saúde
      startHealthCheck();
    });
  } catch (error: any) {
    log(`Erro ao iniciar o servidor: ${error.message}`, 'server');
    process.exit(1);
  }
}

init();