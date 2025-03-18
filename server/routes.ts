import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import cors from "cors";
import { compare } from 'bcryptjs';
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { eq } from 'drizzle-orm';
import { db } from './db';
import { insertSettingsSchema, siteSettings } from "@shared/schema";

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
  
  console.log("Usando SESSION_SECRET para configurar a sessão");
  
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
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
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Estratégia de autenticação local
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Credenciais inválidas" });
      }

      const isValidPassword = await compare(password, user.password);
      if (!isValidPassword) {
        return done(null, false, { message: "Credenciais inválidas" });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  // Helper para validação de schemas
  const validateSchema = (schema: any, data: any) => {
    try {
      return { data: schema.parse(data), error: null };
    } catch (error) {
      if (error instanceof ZodError) {
        return { data: null, error: fromZodError(error).message };
      }
      return { data: null, error: "Erro de validação desconhecido" };
    }
  };

  // Rota de login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Credenciais inválidas" });

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);

        return res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role
        });
      });
    })(req, res, next);
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
      
      // Cria o usuário
      const newUser = await storage.createUser({
        username,
        password,
        email,
        name,
        role: "user",
      });
      
      // Faz login automático após registro
      req.login(newUser, (loginErr) => {
        if (loginErr) return next(loginErr);
        
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

  // API para livros
  app.get("/api/books", async (req, res) => {
    try {
      const books = await storage.getAllBooks();
      res.json(books);
    } catch (error) {
      console.error("Erro ao buscar livros:", error);
      res.status(500).json({ message: "Erro ao buscar livros" });
    }
  });

  const server = createServer(app);
  return server;
}