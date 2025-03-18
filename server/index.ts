import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

(async () => {
  try {
    console.log("Iniciando servidor...");
    console.log("Verificando variáveis de ambiente...");
    console.log("DATABASE_URL presente:", !!process.env.DATABASE_URL);
    console.log("SESSION_SECRET presente:", !!process.env.SESSION_SECRET);

    const server = await registerRoutes(app);

    // Middleware de erro global com logs detalhados
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      const stack = err.stack;

      // Log detalhado do erro
      console.error(`[ERROR] ${status}: ${message}`);
      console.error("Stack trace:", stack);

      // Enviar resposta ao cliente
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      console.log("Configurando Vite para ambiente de desenvolvimento...");
      await setupVite(app, server);
    } else {
      console.log("Configurando arquivos estáticos para produção...");
      serveStatic(app);
    }

    const port = process.env.PORT || 5000;
    const host = process.env.HOST || "0.0.0.0";

    server.listen({
      port: Number(port),
      host,
      reusePort: true,
    }, () => {
      log(`Servidor rodando em ${host}:${port}`);
      log(`Ambiente: ${app.get("env")}`);
    });
  } catch (error) {
    console.error("Erro fatal durante a inicialização do servidor:", error);
    process.exit(1);
  }
})();