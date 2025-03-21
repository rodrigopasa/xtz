# Guia de Implantação - BiblioTech

Este guia detalha o processo de implantação da plataforma BiblioTech usando o Coolify como plataforma de orquestração de contêineres e o Neon Database como serviço de banco de dados PostgreSQL.

## Pré-requisitos

1. Uma conta no [Coolify](https://coolify.io/)
2. Uma conta no [Neon Database](https://neon.tech/)
3. Acesso ao repositório do código fonte

## Passo 1: Configurar o Banco de Dados Neon

1. Acesse o dashboard do Neon e crie um novo projeto
2. Crie um novo banco de dados denominado `bibliotech` (ou outro nome de sua preferência)
3. No painel de controle do banco, obtenha a string de conexão. Ela será necessária para configurar o aplicativo no Coolify
4. Certifique-se de que o banco esteja configurado para aceitar conexões de qualquer IP

## Passo 2: Configurar a Aplicação no Coolify

1. Acesse o dashboard do Coolify e adicione um novo serviço
2. Selecione "Application" como tipo de serviço
3. Conecte seu repositório Git que contém o código da aplicação
4. Configure as seguintes opções:
   - **Build Pack**: Docker (usará o Dockerfile existente no projeto)
   - **Port**: 5000 (porta exposta no Dockerfile)
   - **Deployment Method**: Docker

## Passo 3: Configurar as Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no Coolify:

```
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
SESSION_SECRET=sua_chave_secreta_longa_aqui
COOKIE_SECURE=true
VITE_DEV_SERVER_ENABLED=false
DATABASE_URL=postgresql://usuario:senha@seu-host-neon.com/banco_de_dados?sslmode=require
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=50000000
BOOKS_DIR=/app/public/books
COVERS_DIR=/app/public/covers
```

> **Importante**: Substitua `sua_chave_secreta_longa_aqui` por uma string aleatória segura e `usuario:senha@seu-host-neon.com/banco_de_dados` pelos dados de conexão do seu banco Neon.

## Passo 4: Configurar Volume de Persistência

Para manter os arquivos de upload (livros e capas) entre as atualizações, configure volumes persistentes no Coolify:

1. Na configuração do serviço, vá para a seção "Volumes"
2. Adicione os seguintes volumes:
   - `/app/public/books`: para armazenar os arquivos EPUB e PDF
   - `/app/public/covers`: para armazenar as capas dos livros
   - `/app/uploads`: para armazenar arquivos temporários de upload

## Passo 5: Implantar a Aplicação

1. Salve todas as configurações
2. Clique em "Deploy" para iniciar o processo de implantação
3. Monitore os logs durante a implantação para garantir que tudo está funcionando corretamente

## Verificações Pós-Implantação

Após a implantação ser concluída, verifique:

1. **Conectividade do Banco de Dados**: Verifique nos logs se a aplicação conseguiu se conectar ao banco de dados Neon
2. **Inicialização do Sistema**: Confira se o sistema foi inicializado corretamente, incluindo a criação do usuário admin
3. **Acesso à Aplicação**: Tente acessar a URL fornecida pelo Coolify e faça login com as credenciais padrão:
   - Usuário: `admin`
   - Senha: `admin123`
   - **Importante**: Altere essas credenciais após o primeiro login!

## Solução de Problemas Comuns

### Tela em Branco ou Erro 502

Se a aplicação estiver mostrando uma tela em branco ou erro 502, verifique:

1. **Variáveis de Ambiente**: Garanta que `VITE_DEV_SERVER_ENABLED=false` está configurado
2. **Logs do Contêiner**: Verifique os logs no Coolify para identificar possíveis erros
3. **Conexão com o Banco**: Confirme que a string de conexão do banco de dados está correta e acessível

### Problemas de Conexão com o Banco de Dados

Se houver problemas de conexão com o banco Neon:

1. Verifique se a string de conexão está correta
2. Confirme que o firewall do Neon está configurado para permitir conexões do IP do Coolify
3. Verifique se o banco de dados foi criado corretamente

### Erros de Permissão de Arquivo

Se houver erros relacionados a permissões de arquivos:

1. Verifique se os volumes foram configurados corretamente
2. Confirme que os diretórios no contêiner têm as permissões adequadas

## Atualizações e Manutenção

Para atualizar a aplicação:

1. Faça push das alterações para o repositório conectado
2. No Coolify, vá para o serviço e clique em "Redeploy"

## Monitoramento

O Coolify fornece ferramentas básicas de monitoramento. Recomendamos configurar:

1. **Alertas de Saúde**: Configure alertas para notificar quando o serviço estiver inativo
2. **Monitoramento de Logs**: Utilize a funcionalidade de logs do Coolify para identificar problemas

## Backup do Banco de Dados

Configure backups regulares do banco de dados Neon para evitar perda de dados. O Neon oferece funcionalidades de backup automático em seus planos pagos.

---

Este guia de implantação foi elaborado para facilitar o processo de colocar a plataforma BiblioTech em produção usando Coolify e Neon Database. Para questões específicas ou problemas não abordados aqui, consulte a documentação oficial do Coolify e do Neon.