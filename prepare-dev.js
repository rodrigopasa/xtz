#!/usr/bin/env node

// Script para preparar o ambiente de desenvolvimento
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const serverPublicDir = path.join(process.cwd(), 'server', 'public');

// Verifica se o diretório existe
if (!fs.existsSync(serverPublicDir)) {
  console.log('Criando diretório server/public para desenvolvimento...');
  
  // Cria o diretório server/public
  fs.mkdirSync(serverPublicDir, { recursive: true });
  
  // Cria um arquivo index.html vazio para evitar o erro
  fs.writeFileSync(
    path.join(serverPublicDir, 'index.html'),
    '<!-- Placeholder para desenvolvimento -->'
  );
  
  console.log('Diretório server/public criado com sucesso.');
}

console.log('Ambiente de desenvolvimento pronto.');