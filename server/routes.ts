import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import cors from "cors";
import { compare, hash } from 'bcryptjs';
import * as z from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { eq } from 'drizzle-orm';
import { db } from './db';
import { insertSettingsSchema, insertSeriesSchema, insertBookSchema, siteSettings } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuração para aceitar JSON no corpo das requisições
  app.use(express.json());

  // Configuração do CORS
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Configuração da sessão
  const MemoryStoreSession = MemoryStore(session);
  const sessionSecret = process.env.SESSION_SECRET || "bibliotech-secret-key-2025";

  console.log("Configurando sessão com SECRET");

  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    },
    store: new MemoryStoreSession({
      checkPeriod: 86400000
    })
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });

  // Rota para atualizar configurações
  app.put("/api/settings", async (req, res) => {
    try {
      const { data, error } = validateSchema(insertSettingsSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }

      const settings = await db.select().from(siteSettings).limit(1);

      if (settings.length > 0) {
        const [updatedSettings] = await db
          .update(siteSettings)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(siteSettings.id, settings[0].id))
          .returning();
        res.json(updatedSettings);
      } else {
        const [newSettings] = await db
          .insert(siteSettings)
          .values({ ...data, updatedAt: new Date() })
          .returning();
        res.json(newSettings);
      }
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      console.error("Erro ao buscar séries:", error);
      res.status(500).json({ message: "Erro ao buscar séries" });
    }
  });

  app.post("/api/series", isAdmin, async (req, res) => {
    try {
      const seriesData = insertSeriesSchema.parse(req.body);
      const series = await storage.createSeries(seriesData);
      res.status(201).json(series);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // ===== API de Livros =====

  // Listar todos os livros
  app.get("/api/books", async (req, res) => {
    try {
      // Verifique se há parâmetros de consulta
      const { featured, isNew, isFree } = req.query;

      if (featured === 'true') {
        const books = await storage.getFeaturedBooks();
        return res.json(books);
      } else if (isNew === 'true') {
        const books = await storage.getNewBooks();
        return res.json(books);
      } else if (isFree === 'true') {
        const books = await storage.getFreeBooks();
        return res.json(books);
      }

      // Se não houver parâmetros, retorna todos os livros
      const books = await storage.getAllBooks();
      res.json(books);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

      // Verificar se o novo slug já está em uso por outro livro
      if (bookData.slug !== existingBook.slug) {
        const bookBySlug = await storage.getBookBySlug(bookData.slug);
        if (bookBySlug && bookBySlug.id !== bookId) {
          return res.status(400).json({ message: "Já existe um livro com este slug" });
        }
      }

      const updatedBook = await storage.updateBook(bookId, bookData);      res.json(updatedBook);
    } catch (error) {
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
    } catch (error) {
      console.error("Erro ao excluir livro:", error);
      res.status(500).json({ message: "Erro ao excluir livro" });
    }
  });

  // Incrementar contagem de downloads
  app.post("/api/books/:id/download", async (req, res) => {
    try {
      const bookId = parseInt(req.params.id);

      // Verificar se o livro existe
      const existingBook = await storage.getBook(bookId);
      if (!existingBook) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }

      const updatedBook = await storage.incrementDownloadCount(bookId);
      res.json(updatedBook);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipo de arquivo não suportado. Use JPEG, PNG, WEBP ou GIF.'));
      }
    }
  });

  // Configuração do Multer para upload de e-books (EPUB, PDF)
  const bookStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, booksDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });

  const bookUpload = multer({
    storage: bookStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
      if (file.fieldname === 'epub' && file.mimetype === 'application/epub+zip') {
        cb(null, true);
      } else if (file.fieldname === 'pdf' && file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error(`Tipo de arquivo não suportado para ${file.fieldname}. Use formato apropriado.`));
      }
    }
  });

  // Rota para upload de capa
  app.post("/api/upload/cover", isAdmin, coverUpload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      // Retornar URL relativa para o frontend
      const fileUrl = `/uploads/covers/${req.file.filename}`;
      console.log("Upload de capa realizado com sucesso:", fileUrl);

      res.json({ coverUrl: fileUrl });
    } catch (error) {
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

      // Retornar URL relativa para o frontend
      const fileUrl = `/uploads/books/${req.file.filename}`;
      console.log("Upload de EPUB realizado com sucesso:", fileUrl);

      res.json({ epubUrl: fileUrl });
    } catch (error) {
      console.error("Erro no upload de EPUB:", error);
      res.status(500).json({ message: "Erro no upload de EPUB" });
    }
  });

  // Rota para upload de PDF
  app.post("/api/upload/pdf", isAdmin, bookUpload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo foi enviado" });
      }

      // Retornar URL relativa para o frontend
      const fileUrl = `/uploads/books/${req.file.filename}`;
      console.log("Upload de PDF realizado com sucesso:", fileUrl);

      res.json({ pdfUrl: fileUrl });
    } catch (error) {
      console.error("Erro no upload de PDF:", error);
      res.status(500).json({ message: "Erro no upload de PDF" });
    }
  });

  const server = createServer(app);
  return server;
}