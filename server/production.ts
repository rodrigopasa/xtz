import express, { Express } from "express";
import path from "path";
import fs from "fs";

// Usamos process.cwd() para ter compatibilidade tanto com ESM quanto com CommonJS
const ROOT_DIR = process.cwd();

/**
 * Configura o servidor Express para servir arquivos estáticos em produção.
 * Esta função deve ser usada apenas quando NODE_ENV=production.
 */
export function setupProductionServer(app: Express) {
  console.log("Configurando servidor para ambiente de produção");
  
  // Determina o caminho correto para a pasta dist/public
  const distPath = path.resolve(ROOT_DIR, "dist", "public");
  
  if (!fs.existsSync(distPath)) {
    console.error(`Diretório de build não encontrado: ${distPath}`);
    console.error("Certifique-se de que a aplicação foi compilada antes de executar em produção");
    return false;
  }
  
  console.log(`Servindo arquivos estáticos de: ${distPath}`);
  
  // Configura o middleware para servir arquivos estáticos
  app.use(express.static(distPath));
  
  // Configura a rota de fallback para SPA (Single Page Application)
  app.get("*", (req, res) => {
    // Ignora rotas de API
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ message: "API endpoint não encontrado" });
    }
    
    // Serve o arquivo index.html para todas as outras rotas
    res.sendFile(path.join(distPath, "index.html"));
  });
  
  console.log("Servidor de produção configurado com sucesso");
  return true;
}