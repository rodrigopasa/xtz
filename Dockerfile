FROM node:20-slim

WORKDIR /app

# Instalar dependências necessárias
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos do projeto
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências
RUN npm ci

# Copiar o restante do código
COPY . .

# Criar diretórios necessários
RUN mkdir -p public/covers public/books public/uploads && \
    chmod -R 755 public

# Build do projeto
RUN npm run build

# Expor porta
EXPOSE 5000

# Usar dumb-init para gerenciar sinais corretamente
ENTRYPOINT ["dumb-init", "--"]

# Comando para rodar o servidor
CMD ["npm", "run", "start"]