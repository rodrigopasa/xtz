// Versão alternativa das rotas usando SQLite
import express, { Express, Request, Response, NextFunction } from 'express';
import http from 'http';
import bcrypt from 'bcryptjs';
import { db, checkDatabaseHealth } from './db-sqlite';
import * as schema from '@shared/schema';
import { eq } from 'drizzle-orm';
import session from 'express-session';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { sitemapGenerator } from './sitemap';

// Configuração das pastas de upload
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '50000000'); // 50MB padrão

// Garante que os diretórios existem
['books', 'covers'].forEach(dir => {
  const fullPath = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Configuração para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = req.path.includes('upload-book') ? 'books' : 'covers';
    cb(null, path.join(UPLOAD_DIR, fileType));
  },
  filename: (req, file, cb) => {
    // Gera um nome de arquivo único baseado no nome original e timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // Aceita apenas EPUBs, PDFs e imagens
    if (req.path.includes('upload-book')) {
      if (file.mimetype === 'application/epub+zip' || file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Formato de arquivo não suportado. Apenas EPUB e PDF são permitidos.'));
      }
    } else if (req.path.includes('upload-cover')) {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Formato de arquivo não suportado. Apenas imagens são permitidas.'));
      }
    } else {
      cb(new Error('Tipo de upload não suportado.'));
    }
  }
});

// Middleware de autenticação
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ message: 'Não autenticado' });
  }
};

// Middleware para verificar se é administrador
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Acesso negado' });
  }
};

// Função para gerar hash de senha
async function generateHash(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Verificar saúde do banco de dados
async function checkDbHealth(): Promise<boolean> {
  return await checkDatabaseHealth();
}

// Função para inicializar o sistema
async function initializeSystem() {
  try {
    // Verificar se já existe um administrador
    const adminExists = await db.select()
      .from(schema.users)
      .where(eq(schema.users.role, 'admin'))
      .limit(1)
      .execute();

    // Se não existir admin, criar um padrão
    if (adminExists.length === 0) {
      const adminPassword = await generateHash('admin123');
      
      await db.insert(schema.users)
        .values({
          username: 'admin',
          password: adminPassword,
          email: 'admin@elexandria.com',
          name: 'Administrador',
          role: 'admin'
        })
        .execute();
      
      console.log('Administrador padrão criado');
    }
    
    // Gerar sitemap inicial
    await sitemapGenerator.generateSitemap();
    
    return true;
  } catch (error) {
    console.error('Erro ao inicializar o sistema:', error);
    return false;
  }
}

// Registra as rotas da API
export async function registerRoutes(app: Express): Promise<http.Server> {
  // Configuração da sessão
  const sessionSecret = process.env.SESSION_SECRET || 'elexandria-secret-key';
  
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  }));

  // Inicialização do sistema
  await initializeSystem();

  // Servir arquivos estáticos
  app.use('/uploads', express.static(UPLOAD_DIR));

  // Rota para o sitemap.xml
  app.get('/sitemap.xml', (req, res) => {
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    if (fs.existsSync(sitemapPath)) {
      res.header('Content-Type', 'application/xml');
      res.sendFile(sitemapPath);
    } else {
      res.status(404).send('Sitemap não encontrado');
    }
  });
  
  // Verificação de saúde
  app.get('/api/health', async (req, res) => {
    const dbHealth = await checkDbHealth();
    res.json({
      status: 'ok',
      database: dbHealth ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  });

  // Autenticação
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const users = await db.select()
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .execute();
      
      if (users.length === 0) {
        return res.status(401).json({ message: 'Usuário ou senha inválidos' });
      }
      
      const user = users[0];
      const passwordMatch = await bcrypt.compare(password, user.password);
      
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Usuário ou senha inválidos' });
      }
      
      // Usuário autenticado
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl
      };
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl
      });
      
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      res.status(500).json({ message: 'Erro ao processar login' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password, email, name } = req.body;
      
      // Verificar se o usuário já existe
      const existingUser = await db.select()
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .execute();
      
      if (existingUser.length > 0) {
        return res.status(400).json({ message: 'Nome de usuário já está em uso' });
      }
      
      // Verificar se o email já existe
      const existingEmail = await db.select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .execute();
      
      if (existingEmail.length > 0) {
        return res.status(400).json({ message: 'Email já está em uso' });
      }
      
      // Criar hash da senha
      const hashedPassword = await generateHash(password);
      
      // Inserir o novo usuário
      const result = await db.insert(schema.users)
        .values({
          username,
          password: hashedPassword,
          email,
          name,
          role: 'user'
        })
        .execute();
      
      // Recuperar o usuário recém-criado
      const newUser = await db.select()
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .execute();
      
      if (newUser.length === 0) {
        return res.status(500).json({ message: 'Erro ao criar usuário' });
      }
      
      // Usuário criado com sucesso
      req.session.user = {
        id: newUser[0].id,
        username: newUser[0].username,
        email: newUser[0].email,
        name: newUser[0].name,
        role: newUser[0].role,
        avatarUrl: newUser[0].avatarUrl
      };
      
      res.status(201).json({
        id: newUser[0].id,
        username: newUser[0].username,
        email: newUser[0].email,
        name: newUser[0].name,
        role: newUser[0].role,
        avatarUrl: newUser[0].avatarUrl
      });
      
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      res.status(500).json({ message: 'Erro ao processar registro' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    if (req.session.user) {
      // Buscar dados atualizados do usuário
      try {
        const user = await db.select()
          .from(schema.users)
          .where(eq(schema.users.id, req.session.user.id))
          .execute();
        
        if (user.length === 0) {
          req.session.destroy(() => {});
          return res.status(401).json({ message: 'Não autenticado' });
        }
        
        res.json({
          id: user[0].id,
          username: user[0].username,
          email: user[0].email,
          name: user[0].name,
          role: user[0].role,
          avatarUrl: user[0].avatarUrl
        });
      } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ message: 'Erro ao buscar dados do usuário' });
      }
    } else {
      res.status(401).json({ message: 'Não autenticado' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ message: 'Logout realizado com sucesso' });
    });
  });

  // Configurações do site
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await db.select()
        .from(schema.siteSettings)
        .limit(1)
        .execute();
      
      if (settings.length === 0) {
        return res.status(404).json({ message: 'Configurações não encontradas' });
      }
      
      res.json(settings[0]);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      res.status(500).json({ message: 'Erro ao buscar configurações' });
    }
  });

  app.patch('/api/settings', isAdmin, async (req, res) => {
    try {
      const { id, ...data } = req.body;
      
      // Atualizar configurações
      await db.update(schema.siteSettings)
        .set({
          ...data,
          updatedAt: new Date().toISOString()
        })
        .where(eq(schema.siteSettings.id, id))
        .execute();
      
      const updated = await db.select()
        .from(schema.siteSettings)
        .where(eq(schema.siteSettings.id, id))
        .execute();
      
      if (updated.length === 0) {
        return res.status(404).json({ message: 'Configurações não encontradas' });
      }
      
      res.json(updated[0]);
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      res.status(500).json({ message: 'Erro ao atualizar configurações' });
    }
  });

  // CRUD de livros
  app.get('/api/books', async (req, res) => {
    try {
      const { 
        limit = '10', 
        offset = '0',
        category,
        author,
        featured,
        newcomers,
        search
      } = req.query;
      
      // Construir consulta básica
      let query = db.select()
        .from(schema.books)
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
      
      // Aplicar filtros se fornecidos
      if (category) {
        query = query.where(eq(schema.books.categoryId, parseInt(category as string)));
      }
      
      if (author) {
        query = query.where(eq(schema.books.authorId, parseInt(author as string)));
      }
      
      if (featured === 'true') {
        query = query.where(eq(schema.books.isFeatured, 1));
      }
      
      if (newcomers === 'true') {
        query = query.where(eq(schema.books.isNew, 1));
      }
      
      // Executar a consulta
      const books = await query.execute();
      
      // Para cada livro, buscar autor e categoria
      const booksWithDetails = await Promise.all(books.map(async (book) => {
        // Buscar autor
        const authors = await db.select()
          .from(schema.authors)
          .where(eq(schema.authors.id, book.authorId))
          .execute();
        
        const author = authors.length > 0 ? {
          name: authors[0].name,
          slug: authors[0].slug
        } : null;
        
        // Buscar categoria se existir
        let category = null;
        if (book.categoryId) {
          const categories = await db.select()
            .from(schema.categories)
            .where(eq(schema.categories.id, book.categoryId))
            .execute();
          
          category = categories.length > 0 ? {
            name: categories[0].name,
            slug: categories[0].slug
          } : null;
        }
        
        return {
          ...book,
          author,
          category
        };
      }));
      
      res.json(booksWithDetails);
    } catch (error) {
      console.error('Erro ao buscar livros:', error);
      res.status(500).json({ message: 'Erro ao buscar livros' });
    }
  });

  app.get('/api/books/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const books = await db.select()
        .from(schema.books)
        .where(eq(schema.books.id, parseInt(id)))
        .execute();
      
      if (books.length === 0) {
        return res.status(404).json({ message: 'Livro não encontrado' });
      }
      
      const book = books[0];
      
      // Buscar autor
      const authors = await db.select()
        .from(schema.authors)
        .where(eq(schema.authors.id, book.authorId))
        .execute();
      
      const author = authors.length > 0 ? {
        name: authors[0].name,
        slug: authors[0].slug
      } : null;
      
      // Buscar categoria se existir
      let category = null;
      if (book.categoryId) {
        const categories = await db.select()
          .from(schema.categories)
          .where(eq(schema.categories.id, book.categoryId))
          .execute();
        
        category = categories.length > 0 ? {
          name: categories[0].name,
          slug: categories[0].slug
        } : null;
      }
      
      // Verificar se está nos favoritos do usuário atual
      let isFavorite = false;
      if (req.session.user) {
        const favorites = await db.select()
          .from(schema.favorites)
          .where(eq(schema.favorites.userId, req.session.user.id))
          .where(eq(schema.favorites.bookId, book.id))
          .execute();
        
        isFavorite = favorites.length > 0;
      }
      
      res.json({
        ...book,
        author,
        category,
        isFavorite
      });
    } catch (error) {
      console.error('Erro ao buscar livro:', error);
      res.status(500).json({ message: 'Erro ao buscar livro' });
    }
  });

  app.get('/api/books/slug/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      
      const books = await db.select()
        .from(schema.books)
        .where(eq(schema.books.slug, slug))
        .execute();
      
      if (books.length === 0) {
        return res.status(404).json({ message: 'Livro não encontrado' });
      }
      
      const book = books[0];
      
      // Buscar autor
      const authors = await db.select()
        .from(schema.authors)
        .where(eq(schema.authors.id, book.authorId))
        .execute();
      
      const author = authors.length > 0 ? {
        name: authors[0].name,
        slug: authors[0].slug
      } : null;
      
      // Buscar categoria se existir
      let category = null;
      if (book.categoryId) {
        const categories = await db.select()
          .from(schema.categories)
          .where(eq(schema.categories.id, book.categoryId))
          .execute();
        
        category = categories.length > 0 ? {
          name: categories[0].name,
          slug: categories[0].slug
        } : null;
      }
      
      // Verificar se está nos favoritos do usuário atual
      let isFavorite = false;
      if (req.session.user) {
        const favorites = await db.select()
          .from(schema.favorites)
          .where(eq(schema.favorites.userId, req.session.user.id))
          .where(eq(schema.favorites.bookId, book.id))
          .execute();
        
        isFavorite = favorites.length > 0;
      }
      
      res.json({
        ...book,
        author,
        category,
        isFavorite
      });
    } catch (error) {
      console.error('Erro ao buscar livro por slug:', error);
      res.status(500).json({ message: 'Erro ao buscar livro' });
    }
  });

  app.post('/api/books/download/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Incrementar contador de downloads
      await db.update(schema.books)
        .set({
          downloadCount: db.raw('downloadCount + 1'),
          updatedAt: new Date().toISOString()
        })
        .where(eq(schema.books.id, parseInt(id)))
        .execute();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao registrar download:', error);
      res.status(500).json({ message: 'Erro ao registrar download' });
    }
  });

  app.post('/api/books', isAdmin, async (req, res) => {
    try {
      const bookData = req.body;
      
      // Inserir novo livro
      await db.insert(schema.books)
        .values({
          ...bookData,
          isFeatured: bookData.isFeatured ? 1 : 0,
          isNew: bookData.isNew ? 1 : 0,
          isFree: bookData.isFree ? 1 : 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .execute();
      
      // Recuperar o livro inserido
      const books = await db.select()
        .from(schema.books)
        .where(eq(schema.books.slug, bookData.slug))
        .execute();
      
      if (books.length === 0) {
        return res.status(500).json({ message: 'Erro ao criar livro' });
      }
      
      // Atualizar sitemap após adicionar um novo livro
      await sitemapGenerator.generateSitemap();
      
      res.status(201).json(books[0]);
    } catch (error) {
      console.error('Erro ao criar livro:', error);
      res.status(500).json({ message: 'Erro ao criar livro' });
    }
  });

  app.patch('/api/books/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const bookData = req.body;
      
      // Converter booleanos para inteiros para SQLite
      const dataToUpdate = {
        ...bookData,
        isFeatured: bookData.isFeatured ? 1 : 0,
        isNew: bookData.isNew ? 1 : 0,
        isFree: bookData.isFree ? 1 : 0,
        updatedAt: new Date().toISOString()
      };
      
      // Atualizar livro
      await db.update(schema.books)
        .set(dataToUpdate)
        .where(eq(schema.books.id, parseInt(id)))
        .execute();
      
      // Recuperar o livro atualizado
      const books = await db.select()
        .from(schema.books)
        .where(eq(schema.books.id, parseInt(id)))
        .execute();
      
      if (books.length === 0) {
        return res.status(404).json({ message: 'Livro não encontrado' });
      }
      
      // Atualizar sitemap
      await sitemapGenerator.generateSitemap();
      
      res.json(books[0]);
    } catch (error) {
      console.error('Erro ao atualizar livro:', error);
      res.status(500).json({ message: 'Erro ao atualizar livro' });
    }
  });

  app.delete('/api/books/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Buscar o livro para obter os caminhos dos arquivos
      const books = await db.select()
        .from(schema.books)
        .where(eq(schema.books.id, parseInt(id)))
        .execute();
      
      if (books.length === 0) {
        return res.status(404).json({ message: 'Livro não encontrado' });
      }
      
      const book = books[0];
      
      // Excluir o livro
      await db.delete(schema.books)
        .where(eq(schema.books.id, parseInt(id)))
        .execute();
      
      // Remover os arquivos associados
      if (book.epubUrl) {
        const epubPath = path.join(process.cwd(), book.epubUrl);
        if (fs.existsSync(epubPath)) {
          fs.unlinkSync(epubPath);
        }
      }
      
      if (book.pdfUrl) {
        const pdfPath = path.join(process.cwd(), book.pdfUrl);
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
      }
      
      if (book.coverUrl) {
        const coverPath = path.join(process.cwd(), book.coverUrl);
        if (fs.existsSync(coverPath)) {
          fs.unlinkSync(coverPath);
        }
      }
      
      // Atualizar sitemap
      await sitemapGenerator.generateSitemap();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao excluir livro:', error);
      res.status(500).json({ message: 'Erro ao excluir livro' });
    }
  });

  // CRUD de usuários
  app.get('/api/users', isAdmin, async (req, res) => {
    try {
      const users = await db.select()
        .from(schema.users)
        .execute();
      
      // Remover senhas
      const safeUsers = users.map(user => {
        const { password, ...rest } = user;
        return rest;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({ message: 'Erro ao buscar usuários' });
    }
  });

  app.get('/api/users/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const users = await db.select()
        .from(schema.users)
        .where(eq(schema.users.id, parseInt(id)))
        .execute();
      
      if (users.length === 0) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      // Remover senha
      const { password, ...user } = users[0];
      
      res.json(user);
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({ message: 'Erro ao buscar usuário' });
    }
  });

  app.patch('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userData = req.body;
      
      // Verificar se é o próprio usuário ou um admin
      if (req.session.user!.id !== parseInt(id) && req.session.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      
      // Se estiver alterando a senha, gerar hash
      if (userData.password) {
        userData.password = await generateHash(userData.password);
      }
      
      // Atualizar usuário
      await db.update(schema.users)
        .set(userData)
        .where(eq(schema.users.id, parseInt(id)))
        .execute();
      
      // Recuperar o usuário atualizado
      const users = await db.select()
        .from(schema.users)
        .where(eq(schema.users.id, parseInt(id)))
        .execute();
      
      if (users.length === 0) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      // Remover senha
      const { password, ...user } = users[0];
      
      // Se for o usuário atual, atualizar a sessão
      if (req.session.user!.id === parseInt(id)) {
        req.session.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl
        };
      }
      
      res.json(user);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ message: 'Erro ao atualizar usuário' });
    }
  });

  app.delete('/api/users/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Não permitir excluir o próprio usuário
      if (req.session.user!.id === parseInt(id)) {
        return res.status(400).json({ message: 'Não é possível excluir o próprio usuário' });
      }
      
      // Não permitir excluir o último administrador
      const admins = await db.select()
        .from(schema.users)
        .where(eq(schema.users.role, 'admin'))
        .execute();
      
      if (admins.length === 1 && admins[0].id === parseInt(id)) {
        return res.status(400).json({ message: 'Não é possível excluir o último administrador' });
      }
      
      // Excluir o usuário
      await db.delete(schema.users)
        .where(eq(schema.users.id, parseInt(id)))
        .execute();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      res.status(500).json({ message: 'Erro ao excluir usuário' });
    }
  });

  // Categorias
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await db.select()
        .from(schema.categories)
        .execute();
      
      // Para cada categoria, buscar quantidade de livros
      const categoriesWithCounts = await Promise.all(categories.map(async (category) => {
        const books = await db.select()
          .from(schema.books)
          .where(eq(schema.books.categoryId, category.id))
          .execute();
        
        return {
          ...category,
          bookCount: books.length
        };
      }));
      
      res.json(categoriesWithCounts);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      res.status(500).json({ message: 'Erro ao buscar categorias' });
    }
  });

  app.get('/api/categories/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const categories = await db.select()
        .from(schema.categories)
        .where(eq(schema.categories.id, parseInt(id)))
        .execute();
      
      if (categories.length === 0) {
        return res.status(404).json({ message: 'Categoria não encontrada' });
      }
      
      // Buscar quantidade de livros
      const books = await db.select()
        .from(schema.books)
        .where(eq(schema.books.categoryId, parseInt(id)))
        .execute();
      
      res.json({
        ...categories[0],
        bookCount: books.length
      });
    } catch (error) {
      console.error('Erro ao buscar categoria:', error);
      res.status(500).json({ message: 'Erro ao buscar categoria' });
    }
  });

  app.get('/api/categories/slug/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      
      const categories = await db.select()
        .from(schema.categories)
        .where(eq(schema.categories.slug, slug))
        .execute();
      
      if (categories.length === 0) {
        return res.status(404).json({ message: 'Categoria não encontrada' });
      }
      
      // Buscar quantidade de livros
      const books = await db.select()
        .from(schema.books)
        .where(eq(schema.books.categoryId, categories[0].id))
        .execute();
      
      res.json({
        ...categories[0],
        bookCount: books.length
      });
    } catch (error) {
      console.error('Erro ao buscar categoria por slug:', error);
      res.status(500).json({ message: 'Erro ao buscar categoria' });
    }
  });

  app.post('/api/categories', isAdmin, async (req, res) => {
    try {
      const categoryData = req.body;
      
      // Inserir nova categoria
      await db.insert(schema.categories)
        .values(categoryData)
        .execute();
      
      // Recuperar a categoria inserida
      const categories = await db.select()
        .from(schema.categories)
        .where(eq(schema.categories.slug, categoryData.slug))
        .execute();
      
      if (categories.length === 0) {
        return res.status(500).json({ message: 'Erro ao criar categoria' });
      }
      
      // Atualizar sitemap
      await sitemapGenerator.generateSitemap();
      
      res.status(201).json(categories[0]);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      res.status(500).json({ message: 'Erro ao criar categoria' });
    }
  });

  app.patch('/api/categories/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const categoryData = req.body;
      
      // Atualizar categoria
      await db.update(schema.categories)
        .set(categoryData)
        .where(eq(schema.categories.id, parseInt(id)))
        .execute();
      
      // Recuperar a categoria atualizada
      const categories = await db.select()
        .from(schema.categories)
        .where(eq(schema.categories.id, parseInt(id)))
        .execute();
      
      if (categories.length === 0) {
        return res.status(404).json({ message: 'Categoria não encontrada' });
      }
      
      // Atualizar sitemap
      await sitemapGenerator.generateSitemap();
      
      res.json(categories[0]);
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      res.status(500).json({ message: 'Erro ao atualizar categoria' });
    }
  });

  app.delete('/api/categories/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Excluir a categoria
      await db.delete(schema.categories)
        .where(eq(schema.categories.id, parseInt(id)))
        .execute();
      
      // Atualizar sitemap
      await sitemapGenerator.generateSitemap();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      res.status(500).json({ message: 'Erro ao excluir categoria' });
    }
  });

  // Autores
  app.get('/api/authors', async (req, res) => {
    try {
      const authors = await db.select()
        .from(schema.authors)
        .execute();
      
      // Para cada autor, buscar quantidade de livros
      const authorsWithCounts = await Promise.all(authors.map(async (author) => {
        const books = await db.select()
          .from(schema.books)
          .where(eq(schema.books.authorId, author.id))
          .execute();
        
        return {
          ...author,
          bookCount: books.length
        };
      }));
      
      res.json(authorsWithCounts);
    } catch (error) {
      console.error('Erro ao buscar autores:', error);
      res.status(500).json({ message: 'Erro ao buscar autores' });
    }
  });

  app.get('/api/authors/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const authors = await db.select()
        .from(schema.authors)
        .where(eq(schema.authors.id, parseInt(id)))
        .execute();
      
      if (authors.length === 0) {
        return res.status(404).json({ message: 'Autor não encontrado' });
      }
      
      // Buscar quantidade de livros
      const books = await db.select()
        .from(schema.books)
        .where(eq(schema.books.authorId, parseInt(id)))
        .execute();
      
      res.json({
        ...authors[0],
        bookCount: books.length
      });
    } catch (error) {
      console.error('Erro ao buscar autor:', error);
      res.status(500).json({ message: 'Erro ao buscar autor' });
    }
  });

  app.get('/api/authors/slug/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      
      const authors = await db.select()
        .from(schema.authors)
        .where(eq(schema.authors.slug, slug))
        .execute();
      
      if (authors.length === 0) {
        return res.status(404).json({ message: 'Autor não encontrado' });
      }
      
      // Buscar quantidade de livros
      const books = await db.select()
        .from(schema.books)
        .where(eq(schema.books.authorId, authors[0].id))
        .execute();
      
      res.json({
        ...authors[0],
        bookCount: books.length
      });
    } catch (error) {
      console.error('Erro ao buscar autor por slug:', error);
      res.status(500).json({ message: 'Erro ao buscar autor' });
    }
  });

  app.post('/api/authors', isAdmin, async (req, res) => {
    try {
      const authorData = req.body;
      
      // Inserir novo autor
      await db.insert(schema.authors)
        .values(authorData)
        .execute();
      
      // Recuperar o autor inserido
      const authors = await db.select()
        .from(schema.authors)
        .where(eq(schema.authors.slug, authorData.slug))
        .execute();
      
      if (authors.length === 0) {
        return res.status(500).json({ message: 'Erro ao criar autor' });
      }
      
      // Atualizar sitemap
      await sitemapGenerator.generateSitemap();
      
      res.status(201).json(authors[0]);
    } catch (error) {
      console.error('Erro ao criar autor:', error);
      res.status(500).json({ message: 'Erro ao criar autor' });
    }
  });

  app.patch('/api/authors/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const authorData = req.body;
      
      // Atualizar autor
      await db.update(schema.authors)
        .set(authorData)
        .where(eq(schema.authors.id, parseInt(id)))
        .execute();
      
      // Recuperar o autor atualizado
      const authors = await db.select()
        .from(schema.authors)
        .where(eq(schema.authors.id, parseInt(id)))
        .execute();
      
      if (authors.length === 0) {
        return res.status(404).json({ message: 'Autor não encontrado' });
      }
      
      // Atualizar sitemap
      await sitemapGenerator.generateSitemap();
      
      res.json(authors[0]);
    } catch (error) {
      console.error('Erro ao atualizar autor:', error);
      res.status(500).json({ message: 'Erro ao atualizar autor' });
    }
  });

  app.delete('/api/authors/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Excluir o autor
      await db.delete(schema.authors)
        .where(eq(schema.authors.id, parseInt(id)))
        .execute();
      
      // Atualizar sitemap
      await sitemapGenerator.generateSitemap();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao excluir autor:', error);
      res.status(500).json({ message: 'Erro ao excluir autor' });
    }
  });

  // Favoritos
  app.get('/api/favorites', isAuthenticated, async (req, res) => {
    try {
      const favorites = await db.select()
        .from(schema.favorites)
        .where(eq(schema.favorites.userId, req.session.user!.id))
        .execute();
      
      // Buscar detalhes dos livros
      const favoriteBooks = await Promise.all(favorites.map(async (favorite) => {
        const books = await db.select()
          .from(schema.books)
          .where(eq(schema.books.id, favorite.bookId))
          .execute();
        
        if (books.length === 0) {
          return null;
        }
        
        const book = books[0];
        
        // Buscar autor
        const authors = await db.select()
          .from(schema.authors)
          .where(eq(schema.authors.id, book.authorId))
          .execute();
        
        const author = authors.length > 0 ? {
          name: authors[0].name,
          slug: authors[0].slug
        } : null;
        
        // Buscar categoria se existir
        let category = null;
        if (book.categoryId) {
          const categories = await db.select()
            .from(schema.categories)
            .where(eq(schema.categories.id, book.categoryId))
            .execute();
          
          category = categories.length > 0 ? {
            name: categories[0].name,
            slug: categories[0].slug
          } : null;
        }
        
        return {
          ...book,
          author,
          category,
          favoriteId: favorite.id,
          addedAt: favorite.createdAt
        };
      }));
      
      // Filtrar possíveis nulos (livros excluídos)
      const validBooks = favoriteBooks.filter(book => book !== null);
      
      res.json(validBooks);
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
      res.status(500).json({ message: 'Erro ao buscar favoritos' });
    }
  });

  app.post('/api/favorites', isAuthenticated, async (req, res) => {
    try {
      const { bookId } = req.body;
      
      // Verificar se o livro existe
      const books = await db.select()
        .from(schema.books)
        .where(eq(schema.books.id, bookId))
        .execute();
      
      if (books.length === 0) {
        return res.status(404).json({ message: 'Livro não encontrado' });
      }
      
      // Verificar se já está nos favoritos
      const existingFavorites = await db.select()
        .from(schema.favorites)
        .where(eq(schema.favorites.userId, req.session.user!.id))
        .where(eq(schema.favorites.bookId, bookId))
        .execute();
      
      if (existingFavorites.length > 0) {
        return res.status(400).json({ message: 'Livro já está nos favoritos' });
      }
      
      // Adicionar aos favoritos
      await db.insert(schema.favorites)
        .values({
          userId: req.session.user!.id,
          bookId,
          createdAt: new Date().toISOString()
        })
        .execute();
      
      // Recuperar o favorito criado
      const favorites = await db.select()
        .from(schema.favorites)
        .where(eq(schema.favorites.userId, req.session.user!.id))
        .where(eq(schema.favorites.bookId, bookId))
        .execute();
      
      if (favorites.length === 0) {
        return res.status(500).json({ message: 'Erro ao adicionar aos favoritos' });
      }
      
      res.status(201).json(favorites[0]);
    } catch (error) {
      console.error('Erro ao adicionar aos favoritos:', error);
      res.status(500).json({ message: 'Erro ao adicionar aos favoritos' });
    }
  });

  app.delete('/api/favorites/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar se o favorito existe e pertence ao usuário
      const favorites = await db.select()
        .from(schema.favorites)
        .where(eq(schema.favorites.id, parseInt(id)))
        .execute();
      
      if (favorites.length === 0) {
        return res.status(404).json({ message: 'Favorito não encontrado' });
      }
      
      if (favorites[0].userId !== req.session.user!.id) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      
      // Remover dos favoritos
      await db.delete(schema.favorites)
        .where(eq(schema.favorites.id, parseInt(id)))
        .execute();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao remover dos favoritos:', error);
      res.status(500).json({ message: 'Erro ao remover dos favoritos' });
    }
  });

  app.delete('/api/favorites/book/:bookId', isAuthenticated, async (req, res) => {
    try {
      const { bookId } = req.params;
      
      // Remover dos favoritos
      await db.delete(schema.favorites)
        .where(eq(schema.favorites.userId, req.session.user!.id))
        .where(eq(schema.favorites.bookId, parseInt(bookId)))
        .execute();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao remover dos favoritos:', error);
      res.status(500).json({ message: 'Erro ao remover dos favoritos' });
    }
  });

  // Histórico de leitura
  app.get('/api/reading-history', isAuthenticated, async (req, res) => {
    try {
      const history = await db.select()
        .from(schema.readingHistory)
        .where(eq(schema.readingHistory.userId, req.session.user!.id))
        .execute();
      
      // Buscar detalhes dos livros
      const historyWithBooks = await Promise.all(history.map(async (item) => {
        const books = await db.select()
          .from(schema.books)
          .where(eq(schema.books.id, item.bookId))
          .execute();
        
        if (books.length === 0) {
          return null;
        }
        
        const book = books[0];
        
        // Buscar autor
        const authors = await db.select()
          .from(schema.authors)
          .where(eq(schema.authors.id, book.authorId))
          .execute();
        
        const author = authors.length > 0 ? {
          name: authors[0].name,
          slug: authors[0].slug
        } : null;
        
        // Buscar categoria se existir
        let category = null;
        if (book.categoryId) {
          const categories = await db.select()
            .from(schema.categories)
            .where(eq(schema.categories.id, book.categoryId))
            .execute();
          
          category = categories.length > 0 ? {
            name: categories[0].name,
            slug: categories[0].slug
          } : null;
        }
        
        return {
          ...item,
          book: {
            ...book,
            author,
            category
          }
        };
      }));
      
      // Filtrar possíveis nulos (livros excluídos)
      const validHistory = historyWithBooks.filter(item => item !== null);
      
      res.json(validHistory);
    } catch (error) {
      console.error('Erro ao buscar histórico de leitura:', error);
      res.status(500).json({ message: 'Erro ao buscar histórico de leitura' });
    }
  });

  app.post('/api/reading-history', isAuthenticated, async (req, res) => {
    try {
      const { bookId, lastPage, lastPosition, totalPages } = req.body;
      
      // Verificar se o livro existe
      const books = await db.select()
        .from(schema.books)
        .where(eq(schema.books.id, bookId))
        .execute();
      
      if (books.length === 0) {
        return res.status(404).json({ message: 'Livro não encontrado' });
      }
      
      // Verificar se já existe um registro para este livro
      const existingHistory = await db.select()
        .from(schema.readingHistory)
        .where(eq(schema.readingHistory.userId, req.session.user!.id))
        .where(eq(schema.readingHistory.bookId, bookId))
        .execute();
      
      if (existingHistory.length > 0) {
        // Atualizar o registro existente
        await db.update(schema.readingHistory)
          .set({
            lastPage,
            lastPosition,
            totalPages,
            updatedAt: new Date().toISOString()
          })
          .where(eq(schema.readingHistory.id, existingHistory[0].id))
          .execute();
        
        // Recuperar o registro atualizado
        const history = await db.select()
          .from(schema.readingHistory)
          .where(eq(schema.readingHistory.id, existingHistory[0].id))
          .execute();
        
        if (history.length === 0) {
          return res.status(500).json({ message: 'Erro ao atualizar histórico de leitura' });
        }
        
        res.json(history[0]);
      } else {
        // Criar um novo registro
        await db.insert(schema.readingHistory)
          .values({
            userId: req.session.user!.id,
            bookId,
            lastPage,
            lastPosition,
            totalPages,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .execute();
        
        // Recuperar o registro criado
        const history = await db.select()
          .from(schema.readingHistory)
          .where(eq(schema.readingHistory.userId, req.session.user!.id))
          .where(eq(schema.readingHistory.bookId, bookId))
          .execute();
        
        if (history.length === 0) {
          return res.status(500).json({ message: 'Erro ao criar histórico de leitura' });
        }
        
        res.status(201).json(history[0]);
      }
    } catch (error) {
      console.error('Erro ao salvar histórico de leitura:', error);
      res.status(500).json({ message: 'Erro ao salvar histórico de leitura' });
    }
  });

  app.delete('/api/reading-history/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar se o registro existe e pertence ao usuário
      const history = await db.select()
        .from(schema.readingHistory)
        .where(eq(schema.readingHistory.id, parseInt(id)))
        .execute();
      
      if (history.length === 0) {
        return res.status(404).json({ message: 'Histórico não encontrado' });
      }
      
      if (history[0].userId !== req.session.user!.id) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      
      // Remover o registro
      await db.delete(schema.readingHistory)
        .where(eq(schema.readingHistory.id, parseInt(id)))
        .execute();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao remover histórico de leitura:', error);
      res.status(500).json({ message: 'Erro ao remover histórico de leitura' });
    }
  });

  // Comentários
  app.get('/api/comments/book/:bookId', async (req, res) => {
    try {
      const { bookId } = req.params;
      
      const comments = await db.select()
        .from(schema.comments)
        .where(eq(schema.comments.bookId, parseInt(bookId)))
        .where(eq(schema.comments.isApproved, 1))
        .execute();
      
      // Buscar informações dos usuários
      const commentsWithUsers = await Promise.all(comments.map(async (comment) => {
        const users = await db.select()
          .from(schema.users)
          .where(eq(schema.users.id, comment.userId))
          .execute();
        
        if (users.length === 0) {
          return {
            ...comment,
            user: { name: 'Usuário desconhecido', avatarUrl: null }
          };
        }
        
        const { password, ...user } = users[0];
        
        return {
          ...comment,
          user: { name: user.name, avatarUrl: user.avatarUrl }
        };
      }));
      
      res.json(commentsWithUsers);
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      res.status(500).json({ message: 'Erro ao buscar comentários' });
    }
  });

  app.post('/api/comments', isAuthenticated, async (req, res) => {
    try {
      const { bookId, content, rating } = req.body;
      
      // Verificar se o livro existe
      const books = await db.select()
        .from(schema.books)
        .where(eq(schema.books.id, bookId))
        .execute();
      
      if (books.length === 0) {
        return res.status(404).json({ message: 'Livro não encontrado' });
      }
      
      // Criar o comentário (não aprovado por padrão)
      await db.insert(schema.comments)
        .values({
          userId: req.session.user!.id,
          bookId,
          content,
          rating,
          isApproved: 0,
          helpfulCount: 0,
          createdAt: new Date().toISOString()
        })
        .execute();
      
      // Recuperar o comentário criado
      const comments = await db.select()
        .from(schema.comments)
        .where(eq(schema.comments.userId, req.session.user!.id))
        .where(eq(schema.comments.bookId, bookId))
        .orderBy(({ createdAt }) => createdAt, "desc")
        .limit(1)
        .execute();
      
      if (comments.length === 0) {
        return res.status(500).json({ message: 'Erro ao criar comentário' });
      }
      
      res.status(201).json(comments[0]);
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
      res.status(500).json({ message: 'Erro ao criar comentário' });
    }
  });

  app.get('/api/comments/pending', isAdmin, async (req, res) => {
    try {
      const comments = await db.select()
        .from(schema.comments)
        .where(eq(schema.comments.isApproved, 0))
        .execute();
      
      // Buscar informações dos usuários e livros
      const commentsWithDetails = await Promise.all(comments.map(async (comment) => {
        // Buscar usuário
        const users = await db.select()
          .from(schema.users)
          .where(eq(schema.users.id, comment.userId))
          .execute();
        
        const user = users.length > 0 ? {
          id: users[0].id,
          name: users[0].name,
          username: users[0].username
        } : { name: 'Usuário desconhecido' };
        
        // Buscar livro
        const books = await db.select()
          .from(schema.books)
          .where(eq(schema.books.id, comment.bookId))
          .execute();
        
        const book = books.length > 0 ? {
          id: books[0].id,
          title: books[0].title,
          slug: books[0].slug
        } : { title: 'Livro desconhecido' };
        
        return {
          ...comment,
          user,
          book
        };
      }));
      
      res.json(commentsWithDetails);
    } catch (error) {
      console.error('Erro ao buscar comentários pendentes:', error);
      res.status(500).json({ message: 'Erro ao buscar comentários pendentes' });
    }
  });

  app.post('/api/comments/:id/approve', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar se o comentário existe
      const comments = await db.select()
        .from(schema.comments)
        .where(eq(schema.comments.id, parseInt(id)))
        .execute();
      
      if (comments.length === 0) {
        return res.status(404).json({ message: 'Comentário não encontrado' });
      }
      
      // Aprovar o comentário
      await db.update(schema.comments)
        .set({ isApproved: 1 })
        .where(eq(schema.comments.id, parseInt(id)))
        .execute();
      
      // Se tiver rating, atualizar o rating do livro
      const comment = comments[0];
      if (comment.rating) {
        // Buscar todos os ratings aprovados do livro
        const approvedComments = await db.select()
          .from(schema.comments)
          .where(eq(schema.comments.bookId, comment.bookId))
          .where(eq(schema.comments.isApproved, 1))
          .where(({ rating }) => rating !== null)
          .execute();
        
        if (approvedComments.length > 0) {
          // Calcular média dos ratings
          const sum = approvedComments.reduce((acc, curr) => acc + (curr.rating || 0), 0);
          const average = sum / approvedComments.length;
          
          // Atualizar o livro
          await db.update(schema.books)
            .set({
              rating: average,
              ratingCount: approvedComments.length,
              updatedAt: new Date().toISOString()
            })
            .where(eq(schema.books.id, comment.bookId))
            .execute();
        }
      }
      
      // Recuperar o comentário atualizado
      const updatedComments = await db.select()
        .from(schema.comments)
        .where(eq(schema.comments.id, parseInt(id)))
        .execute();
      
      res.json(updatedComments[0]);
    } catch (error) {
      console.error('Erro ao aprovar comentário:', error);
      res.status(500).json({ message: 'Erro ao aprovar comentário' });
    }
  });

  app.post('/api/comments/:id/helpful', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar se o comentário existe
      const comments = await db.select()
        .from(schema.comments)
        .where(eq(schema.comments.id, parseInt(id)))
        .execute();
      
      if (comments.length === 0) {
        return res.status(404).json({ message: 'Comentário não encontrado' });
      }
      
      // Incrementar contador de útil
      await db.update(schema.comments)
        .set({ helpfulCount: comments[0].helpfulCount + 1 })
        .where(eq(schema.comments.id, parseInt(id)))
        .execute();
      
      // Recuperar o comentário atualizado
      const updatedComments = await db.select()
        .from(schema.comments)
        .where(eq(schema.comments.id, parseInt(id)))
        .execute();
      
      res.json(updatedComments[0]);
    } catch (error) {
      console.error('Erro ao marcar comentário como útil:', error);
      res.status(500).json({ message: 'Erro ao marcar comentário como útil' });
    }
  });

  app.delete('/api/comments/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar se o comentário existe
      const comments = await db.select()
        .from(schema.comments)
        .where(eq(schema.comments.id, parseInt(id)))
        .execute();
      
      if (comments.length === 0) {
        return res.status(404).json({ message: 'Comentário não encontrado' });
      }
      
      // Excluir o comentário
      await db.delete(schema.comments)
        .where(eq(schema.comments.id, parseInt(id)))
        .execute();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao excluir comentário:', error);
      res.status(500).json({ message: 'Erro ao excluir comentário' });
    }
  });

  // Upload de arquivos
  app.post('/api/upload-book', isAdmin, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado' });
      }
      
      const fileUrl = `/uploads/books/${req.file.filename}`;
      
      res.json({
        url: fileUrl,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('Erro ao fazer upload de livro:', error);
      res.status(500).json({ message: 'Erro ao fazer upload de livro' });
    }
  });

  app.post('/api/upload-cover', isAdmin, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado' });
      }
      
      const fileUrl = `/uploads/covers/${req.file.filename}`;
      
      res.json({
        url: fileUrl,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('Erro ao fazer upload de capa:', error);
      res.status(500).json({ message: 'Erro ao fazer upload de capa' });
    }
  });

  // Regenerar sitemap
  app.post('/api/sitemap/generate', isAdmin, async (req, res) => {
    try {
      const success = await sitemapGenerator.generateSitemap();
      
      if (success) {
        res.json({ success: true, message: 'Sitemap gerado com sucesso' });
      } else {
        res.status(500).json({ success: false, message: 'Erro ao gerar sitemap' });
      }
    } catch (error) {
      console.error('Erro ao gerar sitemap:', error);
      res.status(500).json({ message: 'Erro ao gerar sitemap' });
    }
  });

  // Retornar a instância do servidor
  return app.listen();
}