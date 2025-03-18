# BiblioTech

Uma plataforma completa de biblioteca digital com suporte a livros EPUB e PDF, catálogo avançado e interface de leitura integrada.

## Requisitos

- Node.js 20+
- TypeScript
- Express
- React com Vite
- TailwindCSS

## Execução em ambiente de desenvolvimento

```bash
# Instalação de dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

## Variáveis de ambiente para produção

As seguintes variáveis de ambiente devem ser configuradas:

```
# Configuração da aplicação
NODE_ENV=production    # Define o ambiente de produção
PORT=5000              # Porta do servidor
HOST=0.0.0.0           # Binding do servidor
SESSION_SECRET=xxxxxx  # Segredo para cookies de sessão

# Configuração do banco de dados PostgreSQL
DATABASE_URL=postgresql://usuario:senha@host:porta/nome_banco  # URL completa do banco de dados
PGHOST=host            # Host do PostgreSQL
PGPORT=5432            # Porta do PostgreSQL
PGUSER=usuario         # Usuário do PostgreSQL
PGPASSWORD=senha       # Senha do PostgreSQL
PGDATABASE=nome_banco  # Nome do banco de dados
```

## Implantação com Docker/Coolify

Este projeto inclui um Dockerfile e um docker-compose.yml para fácil implantação em ambientes como Coolify.

Para implantar com Coolify:

1. Configure o projeto no Coolify apontando para este repositório
2. Defina as variáveis de ambiente necessárias (veja a seção acima)
3. Use o Dockerfile incluído para o build
4. Configure um volume para persistência: `/app/public` para garantir que os uploads sejam preservados entre deploys
5. Configure um banco de dados PostgreSQL e atualize as variáveis de ambiente

### Preparação do banco de dados

Após a primeira implantação, você precisará inicializar o banco de dados:

```bash
# Dentro do container da aplicação
npm run db:push
```

Este comando criará todas as tabelas necessárias no banco de dados com base no esquema definido em `shared/schema.ts`.

### Credenciais padrão do administrador

Após a inicialização do banco de dados, as seguintes credenciais de administrador serão criadas automaticamente:

- Usuário: `admin`
- Senha: `admin123`

**Importante**: É altamente recomendável alterar essa senha imediatamente após o primeiro login.

## Estrutura do projeto

- `/client`: Frontend React com Vite
- `/server`: Backend Express
- `/shared`: Schemas compartilhados entre frontend e backend
- `/public`: Arquivos estáticos e uploads

## Funcionalidades principais

- Catálogo de livros com categorias e autores
- Autenticação de usuários com níveis de acesso
- Leitor EPUB e PDF integrado
- Favoritos e histórico de leitura
- Painel administrativo
- Upload de livros e capas