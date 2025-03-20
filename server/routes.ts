import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Pool } from "@neondatabase/serverless";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import { compare, hash } from 'bcryptjs';
import * as z from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { eq } from 'drizzle-orm';
import { db, getPool } from './db';
import { insertSettingsSchema, insertBookSchema, siteSettings } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sitemapGenerator } from "./sitemap";

// Middleware para verificar se o usuário é administrador
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || (req.user as any)?.role !== "admin") {
    return res.status(403).json({ message: "Acesso não autorizado" });
  }
  next();
};

// Helper para gerar hash de senha
async function generateHash(password: string): Promise<string> {
  return await hash(password, 12);
}

// Function to check database health
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const pool = await getPool();
    await pool.query('SELECT 1');
    return true;
  } catch (error: any) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Função de inicialização do sistema
async function initializeSystem() {
  try {
    // Verificar se já existe um usuário admin
    const adminUser = await storage.getUserByUsername('admin');
    if (adminUser) {
      console.log('Sistema já inicializado - usuário admin existe');
      return true;
    }

    // Criar usuário admin inicial
    const hashedPassword = await generateHash('admin123');
    const newAdmin = await storage.createUser({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@bibliotech.com',
      name: 'Administrador',
      role: 'admin'
    });

    console.log('Usuário admin criado com sucesso:', {
      id: newAdmin.id,
      username: newAdmin.username,
      role: newAdmin.role
    });

    return true;
  } catch (error: any) {
    console.error('Erro ao inicializar sistema:', error);
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Inicialização do sistema
  console.log('Iniciando setup inicial do sistema...');
  await initializeSystem();
  console.log('Setup inicial concluído');

  // Configuração para aceitar JSON no corpo das requisições
  app.use(express.json());

  // Health check para monitoramento
  app.get('/api/health', async (_req, res) => {
    try {
      // Verificar conexão com o banco de dados
      const dbHealthy = await checkDatabaseHealth();
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();

      const healthStatus = {
        status: dbHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(uptime),
        database: {
          connected: dbHealthy,
          lastCheck: new Date().toISOString()
        },
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024)
        }
      };

      const statusCode = dbHealthy ? 200 : 503;
      res.status(statusCode).json(healthStatus);
    } catch (error: any) {
      console.error('Erro no health check:', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  // Configuração do CORS
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Configure PostgreSQL session store
  const PostgreSQLStore = connectPgSimple(session);
  const sessionSecret = process.env.SESSION_SECRET || "bibliotech-secret-key-2025";

  console.log("Configurando sessão com PostgreSQL");

  const pool = await getPool();
  app.use(session({
    store: new PostgreSQLStore({
      pool: pool as any,
      tableName: 'session',
      createTableIfMissing: true
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  }));

  // Inicialização do Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialização do usuário
  passport.serializeUser((user: any, done) => {
    console.log("[Auth] Serializando usuário:", user.id);
    done(null, user.id);
  });

  // Deserialização do usuário
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("[Auth] Deserializando usuário:", id);
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error: any) {
      console.error("[Auth] Erro na deserialização:", error);
      done(error);
    }
  });

  // Estratégia de autenticação local
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      console.log("[Auth] Tentativa de login para usuário:", username);

      const user = await storage.getUserByUsername(username);
      console.log("[Auth] Usuário encontrado:", !!user);

      if (!user) {
        console.log("[Auth] Usuário não encontrado");
        return done(null, false, { message: "Credenciais inválidas" });
      }

      console.log("[Auth] Comparando senhas...");
      const isValid = await compare(password, user.password);
      console.log("[Auth] Senha válida:", isValid);

      if (!isValid) {
        console.log("[Auth] Senha inválida");
        return done(null, false, { message: "Credenciais inválidas" });
      }

      console.log("[Auth] Login bem sucedido para:", username);
      return done(null, user);
    } catch (error: any) {
      console.error("[Auth] Erro na autenticação:", error);
      return done(error);
    }
  }));

  // Rota de login
  app.post("/api/auth/login", async (req, res, next) => {
    try {
      console.log("[Login] Requisição recebida para usuário:", req.body.username);

      const { username, password } = req.body;

      // Buscar usuário
      const user = await storage.getUserByUsername(username);
      console.log("[Login] Usuário encontrado:", !!user);

      if (!user) {
        console.log("[Login] Usuário não encontrado");
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Verificar senha
      console.log("[Login] Verificando senha...");
      const isValidPassword = await compare(password, user.password);
      console.log("[Login] Senha válida:", isValidPassword);

      if (!isValidPassword) {
        console.log("[Login] Senha inválida");
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Login bem sucedido
      req.login(user, (err) => {
        if (err) {
          console.error("[Login] Erro ao criar sessão:", err);
          return next(err);
        }

        console.log("[Login] Login bem sucedido para:", user.username);
        return res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role
        });
      });
    } catch (error: any) {
      console.error("[Login] Erro inesperado:", error);
      next(error);
    }
  });

  // Rota para verificar autenticação
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      });
    }
    res.status(401).json({ message: "Não autenticado" });
  });

  // Rota de registro
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { username, password, email, name } = req.body;

      // Verifica se o usuário já existe
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já está em uso" });
      }

      // Verifica se o email já existe
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      // Hash da senha
      const hashedPassword = await generateHash(password);

      // Cria o usuário
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        name,
        role: "user",
      });

      // Login automático após registro
      req.login(newUser, (err) => {
        if (err) return next(err);

        return res.status(201).json({
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        });
      });
    } catch (error: any) {
      console.error("Erro no registro:", error);
      res.status(500).json({ message: "Erro ao registrar usuário" });
    }
  });

  // Rota de logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Rota para obter configurações
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await db.select().from(siteSettings).limit(1);
      res.json(settings[0] || {
        siteName: "BiblioTech",
        siteDescription: "Sua biblioteca digital",
        primaryColor: "#3b82f6"
      });
    } catch (error: any) {
      res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });

  // Rota para atualizar configurações
  app.put("/api/settings", async (req, res) => {
    try {
      if (!req.isAuthenticated() || (req.user as any)?.role !== "admin") {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }

      const settings = await db.select().from(siteSettings).limit(1);

      if (settings.length > 0) {
        const [updatedSettings] = await db
          .update(siteSettings)
          .set({ ...req.body, updatedAt: new Date() })
          .where(eq(siteSettings.id, settings[0].id))
          .returning();
        res.json(updatedSettings);
      } else {
        const [newSettings] = await db
          .insert(siteSettings)
          .values({ ...req.body, updatedAt: new Date() })
          .returning();
        res.json(newSettings);
      }
    } catch (error: any) {
      console.error("Erro ao atualizar configurações:", error);
      res.status(500).json({ message: "Erro ao atualizar configurações" });
    }
  });

  // API de Admin - Comentários
  app.get("/api/admin/comments", async (req, res) => {
    try {
      // Verificar se o usuário é administrador
      if (!req.isAuthenticated() || (req.user as any)?.role !== "admin") {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }

      const comments = await storage.getAllComments();

      // Enriquecer os dados dos comentários com informações do usuário e livro
      const enrichedComments = await Promise.all(
        comments.map(async (comment) => {
          const user = await storage.getUser(comment.userId);
          const book = await storage.getBook(comment.bookId);

          return {
            ...comment,
            user: user ? {
              id: user.id,
              name: user.name,
              username: user.username,
              avatarUrl: user.avatarUrl
            } : null,
            book: book ? {
              id: book.id,
              title: book.title,
              slug: book.slug,
              coverUrl: book.coverUrl
            } : null
          };
        })
      );

      res.json(enrichedComments);
    } catch (error: any) {
      console.error("Erro ao buscar comentários:", error);
      res.status(500).json({ message: "Erro ao buscar comentários" });
    }
  });

  // Aprovar comentário
  app.post("/api/admin/comments/:id/approve", async (req, res) => {
    try {
      // Verificar se o usuário é administrador
      if (!req.isAuthenticated() || (req.user as any)?.role !== "admin") {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }

      const commentId = parseInt(req.params.id);
      const updatedComment = await storage.approveComment(commentId);

      if (!updatedComment) {
        return res.status(404).json({ message: "Comentário não encontrado" });
      }

      res.json(updatedComment);
    } catch (error: any) {
      console.error("Erro ao aprovar comentário:", error);
      res.status(500).json({ message: "Erro ao aprovar comentário" });
    }
  });

  // Excluir comentário
  app.delete("/api/admin/comments/:id", async (req, res) => {
    try {
      // Verificar se o usuário é administrador
      if (!req.isAuthenticated() || (req.user as any)?.role !== "admin") {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }

      const commentId = parseInt(req.params.id);
      const success = await storage.deleteComment(commentId);

      if (!success) {
        return res.status(404).json({ message: "Comentário não encontrado" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Erro ao excluir comentário:", error);
      res.status(500).json({ message: "Erro ao excluir comentário" });
    }
  });

  // ===== API de Categorias =====

  // Listar todas as categorias
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Erro ao buscar categorias:", error);
      res.status(500).json({ message: "Erro ao buscar categorias" });
    }
  });

  // Obter categoria por ID
  app.get("/api/categories/:id", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const category = await storage.getCategory(categoryId);

      if (!category) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }

      res.json(category);
    } catch (error: any) {
      console.error("Erro ao buscar categoria:", error);
      res.status(500).json({ message: "Erro ao buscar categoria" });
    }
  });

  // Criar nova categoria (apenas admin)
  app.post("/api/categories", async (req, res) => {
    try {
      // Verificar se o usuário é administrador
      if (!req.isAuthenticated() || (req.user as any)?.role !== "admin") {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }

      const { name, slug, iconName } = req.body;

      // Validações básicas
      if (!name || !slug) {
        return res.status(400).json({ message: "Nome e slug são obrigatórios" });
      }

      // Verificar se já existe categoria com o mesmo slug
      const existingCategory = await storage.getCategoryBySlug(slug);
      if (existingCategory) {
        return res.status(400).json({ message: "Já existe uma categoria com este slug" });
      }

      const newCategory = await storage.createCategory({
        name,
        slug,
        iconName: iconName || "BookIcon",
        bookCount: 0
      });

      res.status(201).json(newCategory);
    } catch (error: any) {
      console.error("Erro ao criar categoria:", error);
      res.status(500).json({ message: "Erro ao criar categoria" });
    }
  });

  // Atualizar categoria (apenas admin)
  app.put("/api/categories/:id", async (req, res) => {
    try {
      // Verificar se o usuário é administrador
      if (!req.isAuthenticated() || (req.user as any)?.role !== "admin") {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }

      const categoryId = parseInt(req.params.id);
      const { name, slug, iconName } = req.body;

      // Validações básicas
      if (!name || !slug) {
        return res.status(400).json({ message: "Nome e slug são obrigatórios" });
      }

      // Verificar se existe a categoria
      const category = await storage.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }

      // Verificar se o novo slug já está em uso (exceto pela própria categoria)
      if (slug !== category.slug) {
        const existingCategory = await storage.getCategoryBySlug(slug);
        if (existingCategory && existingCategory.id !== categoryId) {
          return res.status(400).json({ message: "Já existe uma categoria com este slug" });
        }
      }

      const updatedCategory = await storage.updateCategory(categoryId, {
        name,
        slug,
        iconName: iconName || category.iconName
      });

      res.json(updatedCategory);
    } catch (error: any) {
      console.error("Erro ao atualizar categoria:", error);
      res.status(500).json({ message: "Erro ao atualizar categoria" });
    }
  });

  // Excluir categoria (apenas admin)
  app.delete("/api/categories/:id", async (req, res) => {
    try {
      // Verificar se o usuário é administrador
      if (!req.isAuthenticated() || (req.user as any)?.role !== "admin") {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }

      const categoryId = parseInt(req.params.id);

      // Verificar se existe a categoria
      const category = await storage.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }

      const success = await storage.deleteCategory(categoryId);

      if (!success) {
        return res.status(500).json({ message: "Não foi possível excluir a categoria" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Erro ao excluir categoria:", error);
      res.status(500).json({ message: "Erro ao excluir categoria" });
    }
  });

  // ===== API de Autores =====

  // Listar todos os autores
  app.get("/api/authors", async (req, res) => {
    try {
      const authors = await storage.getAllAuthors();
      res.json(authors);
    } catch (error: any) {
      console.error("Erro ao buscar autores:", error);
      res.status(500).json({ message: "Erro ao buscar autores" });
    }
  });

  // Obter autor por ID
  app.get("/api/authors/:id", async (req, res) => {
    try {
      const authorId = parseInt(req.params.id);
      const author = await storage.getAuthor(authorId);

      if (!author) {
        return res.status(404).json({ message: "Autor não encontrado" });
      }

      res.json(author);
    } catch (error: any) {
      console.error("Erro ao buscar autor:", error);
      res.status(500).json({ message: "Erro ao buscar autor" });
    }
  });

  // Criar novo autor (apenas admin)
  app.post("/api/authors", async (req, res) => {
    try {
      // Verificar se o usuário é administrador
      if (!req.isAuthenticated() || (req.user as any)?.role !== "admin") {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }

      const { name, slug, bio, imageUrl } = req.body;

      // Validações básicas
      if (!name || !slug) {
        return res.status(400).json({ message: "Nome e slug são obrigatórios" });
      }

      // Verificar se já existe autor com o mesmo slug
      const existingAuthor = await storage.getAuthorBySlug(slug);
      if (existingAuthor) {
        return res.status(400).json({ message: "Já existe um autor com este slug" });
      }

      const newAuthor = await storage.createAuthor({
        name,
        slug,
        bio: bio || "",
        imageUrl: imageUrl || ""
      });

      res.status(201).json(newAuthor);
    } catch (error: any) {
      console.error("Erro ao criar autor:", error);
      res.status(500).json({ message: "Erro ao criar autor" });
    }
  });

  // Atualizar autor (apenas admin)
  app.put("/api/authors/:id", async (req, res) => {
    try {
      // Verificar se o usuário é administrador
      if (!req.isAuthenticated() || (req.user as any)?.role !== "admin") {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }

      const authorId = parseInt(req.params.id);
      const { name, slug, bio, imageUrl } = req.body;

      // Validações básicas
      if (!name || !slug) {
        return res.status(400).json({ message: "Nome e slug são obrigatórios" });
      }

      // Verificar se existe o autor
      const author = await storage.getAuthor(authorId);
      if (!author) {
        return res.status(404).json({ message: "Autor não encontrado" });
      }

      // Verificar se o novo slug já está em uso (exceto pelo próprio autor)
      if (slug !== author.slug) {
        const existingAuthor = await storage.getAuthorBySlug(slug);
        if (existingAuthor && existingAuthor.id !== authorId) {
          return res.status(400).json({ message: "Já existe um autor com este slug" });
        }
      }

      const updatedAuthor = await storage.updateAuthor(authorId, {
        name,
        slug,
        bio: bio || author.bio,
        imageUrl: imageUrl || author.imageUrl
      });

      res.json(updatedAuthor);
    } catch (error: any) {
      console.error("Erro ao atualizar autor:", error);
      res.status(500).json({ message: "Erro ao atualizar autor" });
    }
  });

  // Excluir autor (apenas admin)
  app.delete("/api/authors/:id", async (req, res) => {
    try {
      // Verificar se o usuário é administrador
      if (!req.isAuthenticated() || (req.user as any)?.role !== "admin") {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }

      const authorId = parseInt(req.params.id);

      // Verificar se existe o autor
      const author = await storage.getAuthor(authorId);
      if (!author) {
        return res.status(404).json({ message: "Autor não encontrado" });
      }

      const success = await storage.deleteAuthor(authorId);

      if (!success) {
        return res.status(500).json({ message: "Não foi possível excluir o autor" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Erro ao excluir autor:", error);
      res.status(500).json({ message: "Erro ao excluir autor" });
    }
  });

  // ===== API de Séries =====

  // Listar todas as séries
  app.get("/api/series", async (req, res) => {
    try {
      const series = await storage.getAllSeries();
      res.json(series);
    } catch (error: any) {
      console.error("Erro ao buscar séries:", error);
      res.status(500).json({ message: "Erro ao buscar séries" });
    }
  });

  app.post("/api/series", isAdmin, async (req, res) => {
    try {
      const seriesData = insertSeriesSchema.parse(req.body);
      const series = await storage.createSeries(seriesData);
      res.status(201).json(series);
    } catch (error: any) {
      console.error("Erro ao criar série:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar série" });
      }
    }
  });

  app.get("/api/series/:id", async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);
      const series = await storage.getSeries(seriesId);

      if (!series) {
        return res.status(404).json({ message: "Série não encontrada" });
      }

      res.json(series);
    } catch (error: any) {
      console.error("Erro ao buscar série:", error);
      res.status(500).json({ message: "Erro ao buscar série" });
    }
  });

  app.put("/api/series/:id", isAdmin, async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);

      // Verificar se a série existe
      const existingSeries = await storage.getSeries(seriesId);
      if (!existingSeries) {
        return res.status(404).json({ message: "Série não encontrada" });
      }

      const seriesData = insertSeriesSchema.parse(req.body);

      // Verificar se o novo slug já está em uso por outra série
      if (seriesData.slug !== existingSeries.slug) {
        const seriesBySlug = await storage.getSeriesBySlug(seriesData.slug);
        if (seriesBySlug && seriesBySlug.id !== seriesId) {
          return res.status(400).json({ message: "Já existe uma série com este slug" });
        }
      }

      const updatedSeries = await storage.updateSeries(seriesId, seriesData);
      res.json(updatedSeries);
    } catch (error: any) {
      console.error("Erro ao atualizar série:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar série" });
      }
    }
  });

  app.delete("/api/series/:id", isAdmin, async (req, res) => {
    try {
      const seriesId = parseInt(req.params.id);

      // Verificar se a série existe
      const existingSeries = await storage.getSeries(seriesId);
      if (!existingSeries) {
        return res.status(404).json({ message: "Série não encontrada" });
      }

      // Verificar se existem livros associados a esta série
      const books = await storage.getBooksBySeries(seriesId);
      if (books.length > 0) {
        return res.status(400).json({
          message: "Não é possível excluir esta série pois existem livros associados a ela",
          bookCount: books.length
        });
      }

      const success = await storage.deleteSeries(seriesId);

      if (!success) {
        return res.status(500).json({ message: "Não foi possível excluir a série" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Erro ao excluir série:", error);
      res.status(500).json({ message: "Erro ao excluir série" });
    }
  });

  // API para usuários administradores
  app.get("/api/admin/users", async (req, res) => {
    try {
      // Verificar se o usuário é administrador
      if (!req.isAuthenticated() || (req.user as any)?.role !== "admin") {
        return res.status(403).json({ message: "Acesso não autorizado" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // ===== API de Livros =====

  // Listar todos os livros
  app.get("/api/books", async (req, res) => {
    try {
      // Verifique se há parâmetros de consulta
      const { featured } = req.query;

      if (featured === 'true') {
        const books = await storage.getFeaturedBooks();
        return res.json(books);
      }

      // Se não houver parâmetros, retorna todos os livros
      const books = await storage.getAllBooks();
      res.json(books);
    } catch (error: any) {
      console.error("Erro ao buscar livros:", error);
      res.status(500).json({ message: "Erro ao buscar livros" });
    }
  });

  // Obter livros por categoria
  app.get("/api/books/category/:categoryId", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const books = await storage.getBooksByCategory(categoryId);
      res.json(books);
    } catch (error: any) {
      console.error("Erro ao buscar livros por categoria:", error);
      res.status(500).json({ message: "Erro ao buscar livros por categoria" });
    }
  });

  // Obter livros por autor
  app.get("/api/books/author/:authorId", async (req, res) => {
    try {
      const authorId = parseInt(req.params.authorId);
      const books = await storage.getBooksByAuthor(authorId);
      res.json(books);
    } catch (error: any) {
      console.error("Erro ao buscar livros por autor:", error);
      res.status(500).json({ message: "Erro ao buscar livros por autor" });
    }
  });

  // Obter livro por slug - Esta rota precisa vir ANTES da rota com :id para evitar conflitos
  app.get("/api/books/slug/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      const book = await storage.getBookBySlug(slug);

      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }

      res.json(book);
    } catch (error: any) {
      console.error("Erro ao buscar livro:", error);
      res.status(500).json({ message: "Erro ao buscar livro" });
    }
  });

  // Obter livro por ID - Esta rota deve vir por último entre as rotas /api/books/*
  app.get("/api/books/:id", async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);
      const book = await storage.getBook(bookId);

      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }

      res.json(book);
    } catch (error: any) {
      console.error("Erro ao buscar livro:", error);
      res.status(500).json({ message: "Erro ao buscar livro" });
    }
  });


  // Criar livro (apenas admin)
  app.post("/api/books", isAdmin, async (req, res) => {
    try {
      const bookData = insertBookSchema.parse(req.body);

      // Verificar se já existe livro com o mesmo slug
      const existingBook = await storage.getBookBySlug(bookData.slug);
      if (existingBook) {
        return res.status(400).json({ message: "Já existe um livro com este slug" });
      }

      const newBook = await storage.createBook(bookData);
      res.status(201).json(newBook);
    } catch (error: any) {
      console.error("Erro ao criar livro:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao criar livro" });
      }
    }
  });

  // Atualizar livro (apenas admin)
  app.put("/api/books/:id", isAdmin, async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);

      // Verificar se o livro existe
      const existingBook = await storage.getBook(bookId);
      if (!existingBook) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }

      const bookData = insertBookSchema.parse(req.body);

      // Verificar se o novo slug já está em usopor outro livro
      if (bookData.slug !== existingBook.slug) {
        const bookBySlug = await storage.getBookBySlug(bookData.slug);
        if (bookBySlug && bookBySlug.id !== bookId) {
          return res.status(400).json({ message: "Já existe um livro com este slug" });
        }
      }

      const updatedBook = await storage.updateBook(bookId, bookData);
      res.json(updatedBook);    } catch (error: any) {
      console.error("Erro ao atualizar livro:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Erro ao atualizar livro" });
      }
    }
  });

  // Excluir livro (apenas admin)
  app.delete("/api/books/:id", isAdmin, async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);

      // Verificar se o livro existe
      const existingBook = await storage.getBook(bookId);
      if (!existingBook) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }

      const success = await storage.deleteBook(bookId);

      if (!success) {
        return res.status(500).json({ message: "Não foi possível excluir o livro" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Erro ao excluir livro:", error);
      res.status(500).json({ message: "Erro ao excluir livro" });
    }
  });

  // Rota para download de livros
  app.get("/api/books/download/:id/:format", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "É necessário estar logado para baixar livros" });
      }

      const bookId = parseInt(req.params.id);
      const format = req.params.format.toLowerCase();

      if (format !== 'epub' && format !== 'pdf') {
        return res.status(400).json({ message: "Formato inválido" });
      }

      const book = await storage.getBook(bookId);
      
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }

      // Verificar se o formato solicitado está disponível
      const fileUrl = format === 'epub' ? book.epubUrl : book.pdfUrl;
      
      if (!fileUrl) {
        return res.status(404).json({ message: `Este livro não possui versão ${format.toUpperCase()}` });
      }

      // Construir caminho para o arquivo
      const filePath = path.join(__dirname, '..', fileUrl);
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
      }

      // Definir nome para download
      const fileName = `${book.title}${book.author ? ` - ${book.author.name}` : ''} (${format.toUpperCase()})${path.extname(fileUrl)}`;
      
      // Incrementar contagem de downloads
      await storage.incrementDownloadCount(bookId);
      
      // Configurar cabeçalhos para download
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Type', format === 'epub' ? 'application/epub+zip' : 'application/pdf');
      
      // Enviar o arquivo
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error("Erro ao processar download:", error);
      res.status(500).json({ message: "Erro ao processar o download" });
    }
  });

  // Incrementar contagem de downloads
  app.post("/api/books/:id/increment-downloads", async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);

      // Verificar se o livro existe
      const existingBook = await storage.getBook(bookId);
      if (!existingBook) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }

      const updatedBook = await storage.incrementDownloadCount(bookId);
      res.json(updatedBook);
    } catch (error: any) {
      console.error("Erro ao incrementar download:", error);
      res.status(500).json({ message: "Erro ao registrar download" });
    }
  });

  // ===== API de Favoritos =====

  // Listar favoritos do usuário
  app.get("/api/favorites", async (req, res) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const userId = (req.user as any).id;
      const favorites = await storage.getFavoriteBooks(userId);

      res.json(favorites);
    } catch (error: any) {
      console.error("Erro ao buscar favoritos:", error);
      res.status(500).json({ message: "Erro ao buscar favoritos" });
    }
  });

  // Adicionar livro aos favoritos
  app.post("/api/favorites/:bookId", async (req, res) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const userId = (req.user as any).id;
      const bookId = parseInt(req.params.bookId);

      // Verificar se o livro existe
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }

      // Verificar se já é favorito
      const isFavorite = await storage.isFavorite(userId, bookId);
      if (isFavorite) {
        return res.status(400).json({ message: "Livro já está nos favoritos" });
      }

      const favorite = await storage.createFavorite({
        userId,
        bookId
      });

      res.status(201).json(favorite);
    } catch (error: any) {
      console.error("Erro ao adicionar aos favoritos:", error);
      res.status(500).json({ message: "Erro ao adicionar aos favoritos" });
    }
  });

  // Remover livro dos favoritos
  app.delete("/api/favorites/:bookId", async (req, res) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const userId = (req.user as any).id;
      const bookId = parseInt(req.params.bookId);

      // Verificar se o livro existe
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }

      // Verificar se está nos favoritos
      const isFavorite = await storage.isFavorite(userId, bookId);
      if (!isFavorite) {
        return res.status(400).json({ message: "Livro não está nos favoritos" });
      }

      const success = await storage.deleteFavorite(userId, bookId);

      if (!success) {
        return res.status(500).json({ message: "Não foi possível remover dos favoritos" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Erro ao remover dos favoritos:", error);
      res.status(500).json({ message: "Erro ao remover dos favoritos" });
    }
  });

  // Verificar se livro está nos favoritos
  app.get("/api/favorites/check/:bookId", async (req, res) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.json({ isFavorite: false });
      }

      const userId = (req.user as any).id;
      const bookId = parseInt(req.params.bookId);

      const isFavorite = await storage.isFavorite(userId, bookId);

      res.json({ isFavorite });
    } catch (error: any) {
      console.error("Erro ao verificar favorito:", error);
      res.status(500).json({ message: "Erro ao verificar favorito" });
    }
  });

  // ===== API de Histórico de Leitura =====

  // Obter histórico de leitura do usuário
  app.get("/api/reading-history", async (req, res) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const userId = (req.user as any).id;
      const history = await storage.getReadingHistoryBooks(userId);

      res.json(history);
    } catch (error: any) {
      console.error("Erro ao buscar histórico de leitura:", error);
      res.status(500).json({ message: "Erro ao buscar histórico de leitura" });
    }
  });

  // Atualizar progresso de leitura (com ID do livro no corpo da requisição)
  app.post("/api/reading-history", async (req, res) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const userId = (req.user as any).id;
      const { bookId, currentPage, totalPages, progress, lastLocation } = req.body;

      if (!bookId) {
        return res.status(400).json({ message: "ID do livro é obrigatório" });
      }

      // Verificar se o livro existe
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }

      // Calcular progresso em porcentagem (0-100)
      let calculatedProgress = progress;
      if (currentPage && totalPages && totalPages > 0) {
        calculatedProgress = Math.round((currentPage / totalPages) * 100);
      }

      const historyEntry = await storage.createOrUpdateReadingHistory({
        userId,
        bookId,
        progress: calculatedProgress || 0,
        isCompleted: calculatedProgress === 100
      });

      res.status(200).json(historyEntry);
    } catch (error: any) {
      console.error("Erro ao atualizar progresso de leitura:", error);
      res.status(500).json({ message: "Erro ao atualizar progresso de leitura" });
    }
  });

  // Atualizar progresso de leitura (com ID do livro na URL)
  app.post("/api/reading-history/:bookId", async (req, res) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const userId = (req.user as any).id;
      const bookId = parseInt(req.params.bookId);
      const { currentPage, totalPages, progress, lastLocation } = req.body;

      // Verificar se o livro existe
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }

      // Calcular progresso em porcentagem (0-100)
      let calculatedProgress = progress;
      if (currentPage && totalPages && totalPages > 0) {
        calculatedProgress = Math.round((currentPage / totalPages) * 100);
      }

      const historyEntry = await storage.createOrUpdateReadingHistory({
        userId,
        bookId,
        progress: calculatedProgress || 0,
        isCompleted: calculatedProgress === 100
      });

      res.status(200).json(historyEntry);
    } catch (error: any) {
      console.error("Erro ao atualizar progresso de leitura:", error);
      res.status(500).json({ message: "Erro ao atualizar progresso de leitura" });
    }
  });

  // ===== API de Comentários =====

  // Listar comentários de um livro
  app.get("/api/books/:bookId/comments", async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);

      // Verificar se o livro existe
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }

      const comments = await storage.getCommentsByBook(bookId);

      // Filtrar apenas comentários aprovados, exceto para admin
      const isAdmin = req.isAuthenticated() && (req.user as any)?.role === "admin";
      const filteredComments = isAdmin
        ? comments
        : comments.filter(comment => comment.isApproved);

      // Enriquecer os dados dos comentários com informações do usuário
      const enrichedComments = await Promise.all(
        filteredComments.map(async (comment) => {
          const user = await storage.getUser(comment.userId);

          return {
            ...comment,
            user: user ? {
              id: user.id,
              name: user.name,
              username: user.username,
              avatarUrl: user.avatarUrl
            } : null
          };
        })
      );

      res.json(enrichedComments);
    } catch (error: any) {
      console.error("Erro ao buscar comentários:", error);
      res.status(500).json({ message: "Erro ao buscar comentários" });
    }
  });

  // Criar comentário
  app.post("/api/books/:bookId/comments", async (req, res) => {
    try {
      // Verificar autenticação
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const userId = (req.user as any).id;
      const bookId = parseInt(req.params.bookId);
      const { text, rating } = req.body;

      // Validações básicas
      if (!text) {
        return res.status(400).json({ message: "Texto do comentário é obrigatório" });
      }

      if (rating !== undefined && (isNaN(rating) || rating < 1 || rating > 5)) {
        return res.status(400).json({ message: "Avaliação deve ser um número entre 1 e 5" });
      }

      // Verificar se o livro existe
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }

      // Auto-aprovação para admin
      const isAdmin = (req.user as any).role === "admin";

      const comment = await storage.createComment({
        userId,
        bookId,
        content: text,
        rating: rating || 0,
        isApproved: isAdmin
      });

      res.status(201).json(comment);
    } catch (error: any) {
      console.error("Erro ao criar comentário:", error);
      res.status(500).json({ message: "Erro ao criar comentário" });
    }
  });

  // Marcar comentário como útil
  app.post("/api/comments/:id/helpful", async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);

      const updatedComment = await storage.incrementHelpfulCount(commentId);

      if (!updatedComment) {
        return res.status(404).json({ message: "Comentário não encontrado" });
      }

      res.json(updatedComment);
    } catch (error: any) {
      console.error("Erro ao marcar comentário como útil:", error);
      res.status(500).json({ message: "Erro ao marcar comentário como útil" });
    }
  });

  // ===== API de Upload de Arquivos =====

  // Configuração de diretórios para upload
  const uploadDir = './uploads';
  const coverDir = path.join(uploadDir, 'covers');
  const booksDir = path.join(uploadDir, 'books');

  // Garantir que os diretórios existam
  [uploadDir, coverDir, booksDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Configuração do Multer para upload de capas
  const coverStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, coverDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
      const ext = path.extname(file.originalname);
      cb(null, 'cover-' + uniqueSuffix + ext);
    }
  });

  const coverUpload = multer({
    storage: coverStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de arquivo não suportado. Use JPEG, PNG ou WebP.'));
      }
    }
  });

  // Configuração do multer para arquivos EPUB e PDF
  const bookStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, booksDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });

  // Configuração do multer para arquivos EPUB e PDF
  const bookUpload = multer({
    storage: bookStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
      // Aceitar qualquer tipo de arquivo se a extensão for correta
      const ext = path.extname(file.originalname).toLowerCase();
      if (file.fieldname === 'file') {
        if (ext === '.epub' || ext === '.pdf') {
          cb(null, true);
        } else {
          cb(new Error('Apenas arquivos EPUB ou PDF são permitidos.'));
        }
      } else {
        cb(new Error('Campo de arquivo inválido'));
      }
    }
  });

  // Rota para upload de capa
  app.post("/api/upload/cover", isAdmin, coverUpload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      const fileUrl = `/uploads/covers/${req.file.filename}`;
      console.log("Upload de capa realizado com sucesso:", fileUrl);

      res.json({ coverUrl: fileUrl });
    } catch (error: any) {
      console.error("Erro no upload de capa:", error);
      res.status(500).json({ message: "Erro no upload de capa" });
    }
  });

  // Rota para upload de EPUB
  app.post("/api/upload/epub", isAdmin, bookUpload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      // Verificar extensão
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (ext !== '.epub') {
        // Remover arquivo enviado se não for EPUB
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Apenas arquivos EPUB são permitidos" });
      }

      const fileUrl = `/uploads/books/${req.file.filename}`;
      console.log("Upload de EPUB realizado com sucesso:", fileUrl);

      res.json({ epubUrl: fileUrl });
    } catch (error: any) {
      console.error("Erro no upload de EPUB:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Erro no upload de EPUB" });
    }
  });

  // Rota para upload de PDF
  app.post("/api/upload/pdf", isAdmin, bookUpload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      // Verificar extensão
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (ext !== '.pdf') {
        // Remover arquivo enviado se não for PDF
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Apenas arquivos PDF são permitidos" });
      }

      const fileUrl = `/uploads/books/${req.file.filename}`;
      console.log("Upload de PDF realizado com sucesso:", fileUrl);

      res.json({ pdfUrl: fileUrl });
    } catch (error: any) {
      console.error("Erro no upload de PDF:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Erro no upload de PDF" });
    }
  });

  const server = createServer(app);
  return server;
}