import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import path from "path";
import { checkDatabaseHealth } from "./db";

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configuração para servir arquivos estáticos
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static('public'));

// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }

    if (logLine.length > 80) {
      logLine = logLine.slice(0, 79) + "…";
    }

    log(logLine);
  });

  next();
});

// Monitoramento periódico do banco de dados
const HEALTH_CHECK_INTERVAL = parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000');
let healthCheckInterval: NodeJS.Timeout;

function startHealthCheck() {
  console.log(`Iniciando monitoramento do banco de dados (intervalo: ${HEALTH_CHECK_INTERVAL}ms)`);
  healthCheckInterval = setInterval(async () => {
    try {
      const isHealthy = await checkDatabaseHealth();
      console.log('Status do banco de dados:', {
        healthy: isHealthy,
        timestamp: new Date().toISOString()
      });

      if (!isHealthy) {
        console.error('Banco de dados não está saudável');
      }
    } catch (error) {
      console.error('Erro no monitoramento do banco de dados:', error);
    }
  }, HEALTH_CHECK_INTERVAL);
}

(async () => {
  try {
    // Verificação inicial das variáveis de ambiente críticas
    console.log("=== Iniciando servidor ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Ambiente:", process.env.NODE_ENV || 'development');

    // Validação das variáveis de ambiente críticas
    const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

    if (missingEnvVars.length > 0) {
      console.error('Erro fatal: Variáveis de ambiente necessárias não encontradas:', missingEnvVars);
      process.exit(1);
    }

    console.log("✓ Todas as variáveis de ambiente críticas estão presentes");

    // Inicializa as rotas
    console.log("Inicializando rotas...");
    const server = await registerRoutes(app);
    console.log("✓ Rotas inicializadas com sucesso");

    // Inicia o monitoramento do banco de dados com intervalo reduzido em produção
    if (process.env.NODE_ENV === 'production') {
      console.log('Configurando monitoramento para ambiente de produção');
      process.env.DB_HEALTH_CHECK_INTERVAL = '15000'; // 15 segundos em produção
    }
    startHealthCheck();
    console.log("✓ Monitoramento do banco de dados iniciado");

    // Middleware de erro global com logs detalhados
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log detalhado do erro
      console.error({
        type: 'ERROR',
        status,
        message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });

      // Enviar resposta ao cliente
      res.status(status).json({ message });
    });

    // Configuração do servidor baseada no ambiente
    if (process.env.NODE_ENV === 'production' || process.env.VITE_DEV_SERVER_ENABLED === 'false') {
      console.log("Ambiente de produção detectado, usando servidor estático");
      // Importar dinamicamente para evitar erros de importação em ambientes de desenvolvimento
      const { setupProductionServer } = await import('./production.js');
      const setupSuccess = setupProductionServer(app);
      
      if (!setupSuccess) {
        console.error("Falha ao configurar servidor de produção");
        process.exit(1);
      }
      
      console.log("✓ Configuração do servidor de produção concluída");
    } else {
      console.log(`Configurando servidor Vite para ambiente: ${app.get("env")}`);
      await setupVite(app, server);
      console.log("✓ Configuração Vite de desenvolvimento concluída");
    }

    const port = process.env.PORT || 5000;
    const host = process.env.HOST || "0.0.0.0";

    server.listen({
      port: Number(port),
      host,
      reusePort: true,
    }, () => {
      log(`✓ Servidor rodando em ${host}:${port}`);
      log(`✓ Ambiente: ${app.get("env")}`);
    });

    // Cleanup ao encerrar
    const cleanup = async () => {
      console.log('Iniciando processo de limpeza...');
      clearInterval(healthCheckInterval);

      try {
        await new Promise<void>((resolve) => {
          server.close(() => {
            console.log('Servidor HTTP fechado com sucesso');
            resolve();
          });
        });
      } catch (error) {
        console.error('Erro ao fechar servidor HTTP:', error);
      }

      process.exit(0);
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);

  } catch (error) {
    console.error("Erro fatal durante a inicialização do servidor:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }
})();