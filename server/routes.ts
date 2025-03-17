import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { 
  insertUserSchema, 
  insertCategorySchema, 
  insertAuthorSchema, 
  insertSeriesSchema, 
  insertBookSchema, 
  insertCommentSchema,
  insertFavoriteSchema,
  insertReadingHistorySchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import cors from "cors";

// ESM module compatibility - definir __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurar diretórios para arquivos
const publicDirectory = path.join(__dirname, "../public");
const uploadsDirectory = path.join(__dirname, "../uploads");

// Diretórios para arquivos públicos
const coversDirectory = path.join(publicDirectory, "covers");
const booksDirectory = path.join(publicDirectory, "books");

// Diretórios para uploads
const uploadsCoversDirectory = path.join(uploadsDirectory, "covers");
const uploadsBooksDirectory = path.join(uploadsDirectory, "books");

// Log dos diretórios configurados
console.log("Configuração de diretórios:");
console.log(`- Public: ${publicDirectory}`);
console.log(`- Uploads: ${uploadsDirectory}`);
console.log(`- Capas: ${coversDirectory}`);
console.log(`- Livros: ${booksDirectory}`);
console.log(`- Uploads de capas: ${uploadsCoversDirectory}`);
console.log(`- Uploads de livros: ${uploadsBooksDirectory}`);

// Garantir que os diretórios existam
[publicDirectory, uploadsDirectory, coversDirectory, booksDirectory, uploadsCoversDirectory, uploadsBooksDirectory].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Diretório criado: ${dir}`);
    }
  } catch (error) {
    console.error(`Erro ao criar diretório ${dir}:`, error);
  }
});

// Configurar storage para upload de capas
const coverStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsCoversDirectory);
  },
  filename: function (req, file, cb) {
    // Pegar o nome original do arquivo e remover caracteres problemáticos
    const originalName = file.originalname.replace(/[^\w.-]/g, '_');
    
    // Se o nome original for muito grande, cortá-lo
    const maxNameLength = 100;
    const truncatedName = originalName.length > maxNameLength 
      ? originalName.substring(0, maxNameLength - 10) + '...' + path.extname(originalName)
      : originalName;
    
    // Adicionar um sufixo único para evitar colisões
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    const extension = path.extname(originalName).toLowerCase();
    
    // Formato final: nome_original-timestamp.extensao
    cb(null, path.basename(truncatedName, extension) + '-' + uniqueSuffix + extension);
  }
});

// Configurar storage para upload de arquivos de livro (EPUB/PDF)
const bookFileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsBooksDirectory);
  },
  filename: function (req, file, cb) {
    // Pegar o nome original do arquivo e remover caracteres problemáticos
    const originalName = file.originalname.replace(/[^\w.-]/g, '_');
    
    // Se o nome original for muito grande, cortá-lo
    const maxNameLength = 100;
    const truncatedName = originalName.length > maxNameLength 
      ? originalName.substring(0, maxNameLength - 10) + '...' + path.extname(originalName)
      : originalName;
    
    // Adicionar um sufixo único para evitar colisões
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
    const extension = path.extname(originalName).toLowerCase();
    
    // Formato final: nome_original-timestamp.extensao
    cb(null, path.basename(truncatedName, extension) + '-' + uniqueSuffix + extension);
  }
});

// Filtro para permitir apenas imagens para capas
const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Filtro para permitir apenas EPUB/PDF
const bookFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (
    file.mimetype === 'application/epub+zip' || 
    file.mimetype === 'application/pdf' ||
    file.originalname.endsWith('.epub') ||
    file.originalname.endsWith('.pdf')
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// Instâncias do multer para diferentes tipos de upload
const uploadCover = multer({ 
  storage: coverStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadBookFile = multer({ 
  storage: bookFileStorage,
  fileFilter: bookFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Declaração para estender session com tipos do usuário
declare module "express-session" {
  interface SessionData {
    user: {
      id: number;
      username: string;
      email: string;
      name: string;
      role: string;
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuração do CORS
  app.use(cors({
    origin: 'https://' + process.env.REPLIT_SLUG + '.' + process.env.REPLIT_SLUG_DOMAIN,
    credentials: true, // Permite cookies nas requisições de CORS
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
  }));
  
  // Endpoint para health check (usado para monitoramento em Coolify/Docker)
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now()
    });
  });
  
  // Configuração de sessão
  const MemoryStoreSession = MemoryStore(session);
  // Forçando ambiente de desenvolvimento para garantir cookies em HTTPS
  const isProduction = false; // process.env.NODE_ENV === 'production';
  
  app.use(session({
    secret: process.env.SESSION_SECRET || "bibliotech-secret-key",
    resave: false, 
    saveUninitialized: false,
    cookie: { 
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      httpOnly: true,
      secure: false, // Desativando secure para ambiente de desenvolvimento
      sameSite: 'lax',
      path: '/' // Garante que o cookie seja enviado para todas as rotas
    },
    name: 'bibliotech.sid', // Nome personalizado para o cookie de sessão
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // 24 horas
    })
  }));
  
  // Configuração do Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configuração de arquivos estáticos
  app.use('/covers', express.static(coversDirectory));
  app.use('/books', express.static(booksDirectory));
  app.use('/uploads', express.static(uploadsDirectory));
  
  // Mostra no console as configurações de arquivos estáticos
  console.log("Rotas de arquivos estáticos:");
  console.log(`- /covers -> ${coversDirectory}`);
  console.log(`- /books -> ${booksDirectory}`);
  console.log(`- /uploads -> ${uploadsDirectory}`);
  
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return done(null, false, { message: "Credenciais inválidas" });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
  
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
  
  // Middleware para verificar autenticação
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Não autorizado" });
  };
  
  // Middleware para verificar se é admin
  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user && (req.user as any).role === "admin") {
      return next();
    }
    res.status(403).json({ message: "Acesso negado" });
  };
  
  // Helper para validar schemas
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
  
  // Rotas de autenticação
  app.post("/api/auth/login", (req, res, next) => {
    console.log("Tentativa de login:", req.body);
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Erro na autenticação:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Falha no login:", info);
        return res.status(401).json({ message: info?.message || "Credenciais inválidas" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Erro ao estabelecer sessão:", loginErr);
          return next(loginErr);
        }
        
        console.log("Login bem-sucedido para:", user.username);
        console.log("ID de sessão:", req.sessionID);
        console.log("Cookies configurados:", res.getHeader('set-cookie'));
        
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
  
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { data, error } = validateSchema(insertUserSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Verificar se o usuário já existe
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já está em uso" });
      }
      
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "E-mail já está em uso" });
      }
      
      // Criar o usuário
      const newUser = await storage.createUser({
        ...data,
        role: "user"  // Forçar role como user para segurança
      });
      
      // Login automático após registro
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Erro ao fazer login automático" });
        }
        return res.status(201).json({
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        });
      });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  app.get("/api/auth/me", (req, res) => {
    console.log("Verificando sessão...");
    console.log("ID de sessão:", req.sessionID);
    console.log("Cookies recebidos:", req.headers.cookie);
    console.log("req.user:", req.user);
    console.log("isAuthenticated:", req.isAuthenticated());
    
    if (req.isAuthenticated()) {
      const user = req.user as any;
      console.log("Usuário autenticado:", user.username);
      
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl
      });
    }
    
    console.log("Usuário não autenticado");
    res.status(401).json({ message: "Não autenticado" });
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.logout(function(err) {
      if (err) {
        return res.status(500).json({ message: "Erro ao sair" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });
  
  // Rotas para Categorias
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar categorias" });
    }
  });
  
  app.get("/api/categories/:slug", async (req, res) => {
    try {
      const category = await storage.getCategoryBySlug(req.params.slug);
      if (!category) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar categoria" });
    }
  });
  
  app.post("/api/categories", isAdmin, async (req, res) => {
    try {
      const { data, error } = validateSchema(insertCategorySchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Verificar se a categoria já existe
      const existingCategory = await storage.getCategoryBySlug(data.slug);
      if (existingCategory) {
        return res.status(400).json({ message: "Slug de categoria já está em uso" });
      }
      
      const newCategory = await storage.createCategory(data);
      res.status(201).json(newCategory);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar categoria" });
    }
  });
  
  app.put("/api/categories/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const existingCategory = await storage.getCategory(id);
      if (!existingCategory) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
      
      const { data, error } = validateSchema(insertCategorySchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Verificar se o slug já está em uso por outra categoria
      if (data.slug !== existingCategory.slug) {
        const categoryWithSlug = await storage.getCategoryBySlug(data.slug);
        if (categoryWithSlug && categoryWithSlug.id !== id) {
          return res.status(400).json({ message: "Slug de categoria já está em uso" });
        }
      }
      
      const updatedCategory = await storage.updateCategory(id, data);
      res.json(updatedCategory);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar categoria" });
    }
  });
  
  app.delete("/api/categories/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Verificar se existem livros usando esta categoria
      const books = await storage.getBooksByCategory(id);
      if (books.length > 0) {
        return res.status(400).json({ message: "Não é possível excluir categoria em uso por livros" });
      }
      
      const success = await storage.deleteCategory(id);
      if (!success) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
      
      res.json({ message: "Categoria excluída com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir categoria" });
    }
  });
  
  // Rotas para Autores
  app.get("/api/authors", async (req, res) => {
    try {
      const authors = await storage.getAllAuthors();
      res.json(authors);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar autores" });
    }
  });
  
  app.get("/api/authors/:slug", async (req, res) => {
    try {
      const author = await storage.getAuthorBySlug(req.params.slug);
      if (!author) {
        return res.status(404).json({ message: "Autor não encontrado" });
      }
      res.json(author);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar autor" });
    }
  });
  
  app.post("/api/authors", isAdmin, async (req, res) => {
    try {
      const { data, error } = validateSchema(insertAuthorSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Verificar se o autor já existe
      const existingAuthor = await storage.getAuthorBySlug(data.slug);
      if (existingAuthor) {
        return res.status(400).json({ message: "Slug de autor já está em uso" });
      }
      
      const newAuthor = await storage.createAuthor(data);
      res.status(201).json(newAuthor);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar autor" });
    }
  });
  
  app.put("/api/authors/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const existingAuthor = await storage.getAuthor(id);
      if (!existingAuthor) {
        return res.status(404).json({ message: "Autor não encontrado" });
      }
      
      const { data, error } = validateSchema(insertAuthorSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Verificar se o slug já está em uso por outro autor
      if (data.slug !== existingAuthor.slug) {
        const authorWithSlug = await storage.getAuthorBySlug(data.slug);
        if (authorWithSlug && authorWithSlug.id !== id) {
          return res.status(400).json({ message: "Slug de autor já está em uso" });
        }
      }
      
      const updatedAuthor = await storage.updateAuthor(id, data);
      res.json(updatedAuthor);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar autor" });
    }
  });
  
  app.delete("/api/authors/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Verificar se existem livros usando este autor
      const books = await storage.getBooksByAuthor(id);
      if (books.length > 0) {
        return res.status(400).json({ message: "Não é possível excluir autor em uso por livros" });
      }
      
      // Verificar se existem séries usando este autor
      const authorSeries = await storage.getSeriesByAuthor(id);
      if (authorSeries.length > 0) {
        return res.status(400).json({ message: "Não é possível excluir autor em uso por séries" });
      }
      
      const success = await storage.deleteAuthor(id);
      if (!success) {
        return res.status(404).json({ message: "Autor não encontrado" });
      }
      
      res.json({ message: "Autor excluído com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir autor" });
    }
  });
  
  // Rotas para Séries
  app.get("/api/series", async (req, res) => {
    try {
      const { author } = req.query;
      
      let seriesList: any[] = [];
      
      if (author) {
        const authorObj = await storage.getAuthorBySlug(author as string);
        if (authorObj) {
          seriesList = await storage.getSeriesByAuthor(authorObj.id);
        } else {
          seriesList = [];
        }
      } else {
        seriesList = await storage.getAllSeries();
      }
      
      // Enriquecer séries com dados do autor
      const enrichedSeries = await Promise.all(seriesList.map(async (series) => {
        const author = await storage.getAuthor(series.authorId);
        return {
          ...series,
          author: author ? { name: author.name, slug: author.slug } : null
        };
      }));
      
      res.json(enrichedSeries);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar séries" });
    }
  });
  
  app.get("/api/series/:slug", async (req, res) => {
    try {
      const series = await storage.getSeriesBySlug(req.params.slug);
      if (!series) {
        return res.status(404).json({ message: "Série não encontrada" });
      }
      
      // Obter o autor da série
      const author = await storage.getAuthor(series.authorId);
      
      // Obter livros da série
      const books = await storage.getBooksBySeries(series.id);
      
      // Enriquecer com dados do autor e ordenar por número do volume
      const enrichedBooks = books
        .map(book => ({
          id: book.id,
          title: book.title,
          slug: book.slug,
          coverUrl: book.coverUrl,
          volumeNumber: book.volumeNumber || 0, // Fallback para 0 se não tiver número
          rating: book.rating || 0
        }))
        .sort((a, b) => a.volumeNumber - b.volumeNumber);
      
      const enrichedSeries = {
        ...series,
        author: author ? { name: author.name, slug: author.slug } : null,
        books: enrichedBooks
      };
      
      res.json(enrichedSeries);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar série" });
    }
  });
  
  app.post("/api/series", isAdmin, async (req, res) => {
    try {
      const { data, error } = validateSchema(insertSeriesSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Verificar se a série já existe
      const existingSeries = await storage.getSeriesBySlug(data.slug);
      if (existingSeries) {
        return res.status(400).json({ message: "Slug de série já está em uso" });
      }
      
      // Verificar se o autor existe
      const authorExists = await storage.getAuthor(data.authorId);
      if (!authorExists) {
        return res.status(400).json({ message: "Autor não encontrado" });
      }
      
      // Criar a série com contagem zerada de livros inicialmente
      const newSeries = await storage.createSeries({
        ...data,
        bookCount: 0
      });
      
      res.status(201).json(newSeries);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar série" });
    }
  });
  
  app.put("/api/series/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const existingSeries = await storage.getSeries(id);
      if (!existingSeries) {
        return res.status(404).json({ message: "Série não encontrada" });
      }
      
      const { data, error } = validateSchema(insertSeriesSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Verificar se o slug já está em uso por outra série
      if (data.slug !== existingSeries.slug) {
        const seriesWithSlug = await storage.getSeriesBySlug(data.slug);
        if (seriesWithSlug && seriesWithSlug.id !== id) {
          return res.status(400).json({ message: "Slug de série já está em uso" });
        }
      }
      
      // Verificar se o autor existe
      if (data.authorId !== existingSeries.authorId) {
        const authorExists = await storage.getAuthor(data.authorId);
        if (!authorExists) {
          return res.status(400).json({ message: "Autor não encontrado" });
        }
      }
      
      const updatedSeries = await storage.updateSeries(id, data);
      res.json(updatedSeries);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar série" });
    }
  });
  
  app.delete("/api/series/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Verificar se existem livros usando esta série
      const books = await storage.getBooksBySeries(id);
      if (books.length > 0) {
        return res.status(400).json({ message: "Não é possível excluir série em uso por livros. Remova os livros da série antes de excluí-la." });
      }
      
      const success = await storage.deleteSeries(id);
      if (!success) {
        return res.status(404).json({ message: "Série não encontrada" });
      }
      
      res.json({ message: "Série excluída com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir série" });
    }
  });
  
  // Rotas para Livros
  app.get("/api/books", async (req, res) => {
    try {
      const { category, author, featured, isNew, isFree } = req.query;
      
      let books: any[] = [];
      
      if (category) {
        const categoryObj = await storage.getCategoryBySlug(category as string);
        if (categoryObj) {
          books = await storage.getBooksByCategory(categoryObj.id);
        } else {
          books = [];
        }
      } else if (author) {
        const authorObj = await storage.getAuthorBySlug(author as string);
        if (authorObj) {
          books = await storage.getBooksByAuthor(authorObj.id);
        } else {
          books = [];
        }
      } else if (featured === 'true') {
        books = await storage.getFeaturedBooks();
      } else if (isNew === 'true') {
        books = await storage.getNewBooks();
      } else if (isFree === 'true') {
        books = await storage.getFreeBooks();
      } else {
        books = await storage.getAllBooks();
      }
      
      // Enriquecer livros com dados de autor e categoria
      const enrichedBooks = await Promise.all(books.map(async (book) => {
        const author = await storage.getAuthor(book.authorId);
        const category = await storage.getCategory(book.categoryId);
        return {
          ...book,
          author: author ? { name: author.name, slug: author.slug } : null,
          category: category ? { name: category.name, slug: category.slug } : null
        };
      }));
      
      res.json(enrichedBooks);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar livros" });
    }
  });
  
  // Rota para obter livro por ID (necessária para o leitor)
  // IMPORTANTE: Esta rota precisa vir ANTES da rota /:slug para evitar conflitos
  app.get("/api/books/id/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      console.log(`MemStorage.getBook - ID: ${id}, Tipo: ${typeof id}`);
      const book = await storage.getBook(id);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      const author = await storage.getAuthor(book.authorId);
      const category = await storage.getCategory(book.categoryId);
      
      // Obter informações da série, se o livro pertencer a uma
      let seriesInfo = null;
      if (book.seriesId) {
        const series = await storage.getSeries(book.seriesId);
        if (series) {
          seriesInfo = {
            id: series.id,
            name: series.name,
            slug: series.slug,
            volume: book.volumeNumber
          };
        }
      }
      
      const enrichedBook = {
        ...book,
        author: author ? { id: author.id, name: author.name, slug: author.slug } : null,
        category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
        series: seriesInfo
      };
      
      res.json(enrichedBook);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar livro por ID" });
    }
  });
  
  // Rota adicional para obter livro diretamente por ID (para compatibilidade)
  app.get("/api/books/:id([0-9]+)", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      console.log(`Buscando livro pelo ID numérico: ${id}`);
      const book = await storage.getBook(id);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      const author = await storage.getAuthor(book.authorId);
      const category = await storage.getCategory(book.categoryId);
      
      // Obter informações da série, se o livro pertencer a uma
      let seriesInfo = null;
      if (book.seriesId) {
        const series = await storage.getSeries(book.seriesId);
        if (series) {
          seriesInfo = {
            id: series.id,
            name: series.name,
            slug: series.slug,
            volume: book.volumeNumber
          };
        }
      }
      
      const enrichedBook = {
        ...book,
        author: author ? { id: author.id, name: author.name, slug: author.slug } : null,
        category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
        series: seriesInfo
      };
      
      res.json(enrichedBook);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar livro por ID" });
    }
  });
  
  // Rota para visualização de arquivos EPUB/PDF (usada pelo leitor)
  app.get("/api/books/view/:id/:format", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const format = req.params.format.toLowerCase();
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      if (format !== 'epub' && format !== 'pdf') {
        return res.status(400).json({ message: "Formato inválido" });
      }
      
      const book = await storage.getBook(id);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      // Verificar se o livro possui o formato solicitado
      const fileUrl = format === 'epub' ? book.epubUrl : book.pdfUrl;
      if (!fileUrl) {
        return res.status(404).json({ message: `Formato ${format.toUpperCase()} não disponível para este livro` });
      }
      
      console.log(`Requisição para visualizar livro - ID: ${id}, Formato: ${format}`);
      console.log(`Livro encontrado: ID: ${book.id}, Título: ${book.title}`);
      console.log(`URL do arquivo ${format}: ${fileUrl}`);
      
      // Obter caminho real do arquivo
      let filePath = '';
      
      if (fileUrl.startsWith('/uploads/')) {
        // Arquivo está no diretório de uploads
        filePath = path.join(uploadsDirectory, fileUrl.substring(9));
        console.log(`Verificando arquivo em: ${filePath} (caminho de uploads)`);
      } else if (fileUrl.startsWith('/books/')) {
        // Arquivo está no diretório de books
        filePath = path.join(booksDirectory, fileUrl.substring(7));
        console.log(`Verificando arquivo em: ${filePath} (caminho de books)`);
      } else {
        // URL não reconhecida
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(filePath)) {
        // Tentar encontrar em outros locais possíveis como fallback
        const possiblePaths = [
          path.join(uploadsBooksDirectory, path.basename(fileUrl)),
          path.join(booksDirectory, path.basename(fileUrl)),
          path.join(__dirname, '..', fileUrl)
        ];
        
        console.log('Tentando localizar o arquivo em caminhos alternativos...');
        let foundPath = null;
        
        for (const altPath of possiblePaths) {
          console.log(`Verificando: ${altPath}`);
          if (fs.existsSync(altPath)) {
            foundPath = altPath;
            console.log(`Arquivo encontrado em caminho alternativo: ${foundPath}`);
            break;
          }
        }
        
        if (!foundPath) {
          return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
        }
        
        filePath = foundPath;
      }
      
      // Verificar se o arquivo está vazio
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return res.status(400).json({ 
          message: "Arquivo sem conteúdo",
          error: "empty_file",
          details: "O arquivo existe no servidor, mas está vazio (0 bytes)."
        });
      }
      
      console.log(`Enviando arquivo: ${filePath} (tamanho: ${stats.size} bytes)`);
      
      // Definir headers adequados para o tipo de arquivo
      if (format === 'epub') {
        res.setHeader('Content-Type', 'application/epub+zip');
      } else {
        res.setHeader('Content-Type', 'application/pdf');
      }
      
      // Permite acesso de qualquer origem (importante para o leitor EPUB)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache');
      
      // Enviar o arquivo
      fs.createReadStream(filePath).pipe(res);
      
    } catch (error) {
      console.error("Erro ao processar visualização:", error);
      res.status(500).json({ message: "Erro ao processar visualização do livro" });
    }
  });
  
  app.get("/api/books/:slug", async (req, res) => {
    try {
      const book = await storage.getBookBySlug(req.params.slug);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      const author = await storage.getAuthor(book.authorId);
      const category = await storage.getCategory(book.categoryId);
      
      // Obter informações da série, se o livro pertencer a uma
      let seriesInfo = null;
      if (book.seriesId) {
        const series = await storage.getSeries(book.seriesId);
        if (series) {
          seriesInfo = {
            id: series.id,
            name: series.name,
            slug: series.slug,
            volume: book.volumeNumber
          };
        }
      }
      
      const enrichedBook = {
        ...book,
        author: author ? { id: author.id, name: author.name, slug: author.slug } : null,
        category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
        series: seriesInfo
      };
      
      res.json(enrichedBook);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar livro" });
    }
  });
  
  app.post("/api/books", isAdmin, async (req, res) => {
    try {
      const { data, error } = validateSchema(insertBookSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Verificar se o livro já existe
      const existingBook = await storage.getBookBySlug(data.slug);
      if (existingBook) {
        return res.status(400).json({ message: "Slug de livro já está em uso" });
      }
      
      // Verificar se a categoria existe
      const category = await storage.getCategory(data.categoryId);
      if (!category) {
        return res.status(400).json({ message: "Categoria não encontrada" });
      }
      
      // Verificar se o autor existe
      const author = await storage.getAuthor(data.authorId);
      if (!author) {
        return res.status(400).json({ message: "Autor não encontrado" });
      }
      
      const newBook = await storage.createBook(data);
      res.status(201).json(newBook);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar livro" });
    }
  });
  
  // Rota para upload de capa de livro
  app.post("/api/books/:id/upload-cover", isAdmin, uploadCover.single('cover'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const book = await storage.getBook(id);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado ou formato inválido" });
      }
      
      // Montar a URL da capa
      const coverUrl = `/covers/${req.file.filename}`;
      
      // Atualizar URL da capa no banco de dados
      const updatedBook = await storage.updateBook(id, { coverUrl });
      
      res.json({ 
        message: "Capa atualizada com sucesso", 
        coverUrl,
        book: updatedBook
      });
    } catch (error) {
      console.error("Erro ao fazer upload de capa:", error);
      res.status(500).json({ message: "Erro ao processar upload da capa" });
    }
  });
  
  // Rota para upload de arquivo EPUB
  app.post("/api/books/:id/upload-epub", isAdmin, uploadBookFile.single('epub'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const book = await storage.getBook(id);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado ou formato inválido" });
      }
      
      // Montar a URL do arquivo EPUB
      const epubUrl = `/books/${req.file.filename}`;
      
      // Atualizar URL do EPUB no banco de dados
      const updatedBook = await storage.updateBook(id, { epubUrl });
      
      res.json({ 
        message: "Arquivo EPUB atualizado com sucesso", 
        epubUrl,
        book: updatedBook
      });
    } catch (error) {
      console.error("Erro ao fazer upload de EPUB:", error);
      res.status(500).json({ message: "Erro ao processar upload do EPUB" });
    }
  });
  
  // Rota para upload de arquivo PDF
  app.post("/api/books/:id/upload-pdf", isAdmin, uploadBookFile.single('pdf'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const book = await storage.getBook(id);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado ou formato inválido" });
      }
      
      // Montar a URL do arquivo PDF
      const pdfUrl = `/books/${req.file.filename}`;
      
      // Atualizar URL do PDF no banco de dados
      const updatedBook = await storage.updateBook(id, { pdfUrl });
      
      res.json({ 
        message: "Arquivo PDF atualizado com sucesso", 
        pdfUrl,
        book: updatedBook
      });
    } catch (error) {
      console.error("Erro ao fazer upload de PDF:", error);
      res.status(500).json({ message: "Erro ao processar upload do PDF" });
    }
  });

  app.put("/api/books/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const existingBook = await storage.getBook(id);
      if (!existingBook) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      const { data, error } = validateSchema(insertBookSchema, req.body);
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      // Verificar se o slug já está em uso por outro livro
      if (data.slug !== existingBook.slug) {
        const bookWithSlug = await storage.getBookBySlug(data.slug);
        if (bookWithSlug && bookWithSlug.id !== id) {
          return res.status(400).json({ message: "Slug de livro já está em uso" });
        }
      }
      
      // Verificar se a categoria existe
      const category = await storage.getCategory(data.categoryId);
      if (!category) {
        return res.status(400).json({ message: "Categoria não encontrada" });
      }
      
      // Verificar se o autor existe
      const author = await storage.getAuthor(data.authorId);
      if (!author) {
        return res.status(400).json({ message: "Autor não encontrado" });
      }
      
      // Se a categoria mudou, atualizar contagens
      if (data.categoryId !== existingBook.categoryId) {
        // Diminuir contagem na categoria antiga
        const oldCategory = await storage.getCategory(existingBook.categoryId);
        if (oldCategory && oldCategory.bookCount > 0) {
          await storage.updateCategory(oldCategory.id, {
            bookCount: oldCategory.bookCount - 1
          });
        }
        
        // Aumentar contagem na nova categoria
        await storage.updateCategory(category.id, {
          bookCount: category.bookCount + 1
        });
      }
      
      const updatedBook = await storage.updateBook(id, data);
      res.json(updatedBook);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar livro" });
    }
  });
  
  app.delete("/api/books/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const success = await storage.deleteBook(id);
      if (!success) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      res.json({ message: "Livro excluído com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir livro" });
    }
  });
  
  app.get("/api/books/:id/download/:format", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const format = req.params.format.toLowerCase();
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      if (format !== 'epub' && format !== 'pdf') {
        return res.status(400).json({ message: "Formato inválido" });
      }
      
      const book = await storage.getBook(id);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      // Verificar se o livro possui o formato solicitado
      const fileUrl = format === 'epub' ? book.epubUrl : book.pdfUrl;
      if (!fileUrl) {
        return res.status(404).json({ message: `Formato ${format.toUpperCase()} não disponível para este livro` });
      }
      
      console.log(`Requisição para download de livro - ID: ${id}, Formato: ${format}`);
      console.log(`Livro encontrado: ID: ${book.id}, Título: ${book.title}`);
      console.log(`URL do arquivo ${format}: ${fileUrl}`);
      
      // Obter caminho real do arquivo
      let filePath = '';
      
      if (fileUrl.startsWith('/uploads/')) {
        // Arquivo está no diretório de uploads
        filePath = path.join(uploadsDirectory, fileUrl.substring(9));
        console.log(`Verificando arquivo em: ${filePath} (caminho de uploads)`);
      } else if (fileUrl.startsWith('/books/')) {
        // Arquivo está no diretório de books
        filePath = path.join(booksDirectory, fileUrl.substring(7));
        console.log(`Verificando arquivo em: ${filePath} (caminho de books)`);
      } else {
        // URL não reconhecida
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(filePath)) {
        // Tentar encontrar em outros locais possíveis como fallback
        const possiblePaths = [
          path.join(uploadsBooksDirectory, path.basename(fileUrl)),
          path.join(booksDirectory, path.basename(fileUrl)),
          path.join(__dirname, '..', fileUrl)
        ];
        
        console.log('Tentando localizar o arquivo em caminhos alternativos...');
        let foundPath = null;
        
        for (const altPath of possiblePaths) {
          console.log(`Verificando: ${altPath}`);
          if (fs.existsSync(altPath)) {
            foundPath = altPath;
            console.log(`Arquivo encontrado em caminho alternativo: ${foundPath}`);
            break;
          }
        }
        
        if (!foundPath) {
          return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
        }
        
        filePath = foundPath;
      }
      
      // Incrementar contador de downloads
      await storage.incrementDownloadCount(id);
      
      // Registrar no histórico se o usuário estiver autenticado
      if (req.isAuthenticated()) {
        const user = req.user as any;
        await storage.createOrUpdateReadingHistory({
          userId: user.id,
          bookId: id,
          progress: 0,
          isCompleted: false
        });
      }
      
      // Enviar o arquivo para download
      const fileSize = fs.statSync(filePath).size;
      console.log(`Arquivo sendo baixado: ${filePath} (tamanho: ${fileSize} bytes)`);
      
      // Definir headers para download
      const fileName = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      if (format === 'epub') {
        res.setHeader('Content-Type', 'application/epub+zip');
      } else {
        res.setHeader('Content-Type', 'application/pdf');
      }
      res.setHeader('Content-Length', fileSize);
      
      // Enviar o arquivo
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error("Erro ao processar download:", error);
      res.status(500).json({ message: "Erro ao processar download" });
    }
  });
  
  // Rotas para Favoritos
  app.get("/api/favorites", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const favoriteBooks = await storage.getFavoriteBooks(user.id);
      
      // Enriquecer livros com dados de autor e categoria
      const enrichedBooks = await Promise.all(favoriteBooks.map(async (book) => {
        const author = await storage.getAuthor(book.authorId);
        const category = await storage.getCategory(book.categoryId);
        
        // Obter informações da série, se o livro pertencer a uma
        let seriesInfo = null;
        if (book.seriesId) {
          const series = await storage.getSeries(book.seriesId);
          if (series) {
            seriesInfo = {
              id: series.id,
              name: series.name,
              slug: series.slug,
              volume: book.volumeNumber
            };
          }
        }
        
        return {
          ...book,
          author: author ? { name: author.name, slug: author.slug } : null,
          category: category ? { name: category.name, slug: category.slug } : null,
          series: seriesInfo
        };
      }));
      
      res.json(enrichedBooks);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar favoritos" });
    }
  });
  
  app.post("/api/favorites", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { bookId } = req.body;
      
      if (!bookId) {
        return res.status(400).json({ message: "ID do livro é obrigatório" });
      }
      
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      const { data, error } = validateSchema(insertFavoriteSchema, {
        userId: user.id,
        bookId
      });
      
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const favorite = await storage.createFavorite(data);
      res.status(201).json(favorite);
    } catch (error) {
      res.status(500).json({ message: "Erro ao adicionar favorito" });
    }
  });
  
  app.delete("/api/favorites/:bookId", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const bookId = parseInt(req.params.bookId);
      
      if (isNaN(bookId)) {
        return res.status(400).json({ message: "ID do livro inválido" });
      }
      
      const success = await storage.deleteFavorite(user.id, bookId);
      if (!success) {
        return res.status(404).json({ message: "Favorito não encontrado" });
      }
      
      res.json({ message: "Favorito removido com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao remover favorito" });
    }
  });
  
  app.get("/api/favorites/check/:bookId", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const bookId = parseInt(req.params.bookId);
      
      if (isNaN(bookId)) {
        return res.status(400).json({ message: "ID do livro inválido" });
      }
      
      const isFavorite = await storage.isFavorite(user.id, bookId);
      res.json({ isFavorite });
    } catch (error) {
      res.status(500).json({ message: "Erro ao verificar favorito" });
    }
  });
  
  // Rotas para Histórico de Leitura
  app.get("/api/reading-history", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const historyWithBooks = await storage.getReadingHistoryBooks(user.id);
      res.json(historyWithBooks);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar histórico de leitura" });
    }
  });
  
  app.post("/api/reading-history", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { bookId, progress, isCompleted } = req.body;
      
      if (!bookId) {
        return res.status(400).json({ message: "ID do livro é obrigatório" });
      }
      
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      const { data, error } = validateSchema(insertReadingHistorySchema, {
        userId: user.id,
        bookId,
        progress: progress || 0,
        isCompleted: isCompleted || false
      });
      
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const history = await storage.createOrUpdateReadingHistory(data);
      res.status(201).json(history);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar histórico de leitura" });
    }
  });
  
  // Rotas para Comentários
  app.get("/api/books/:bookId/comments", async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      
      if (isNaN(bookId)) {
        return res.status(400).json({ message: "ID do livro inválido" });
      }
      
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      const comments = await storage.getCommentsByBook(bookId);
      
      // Enriquecer comentários com dados do usuário
      const enrichedComments = await Promise.all(comments.map(async (comment) => {
        const user = await storage.getUser(comment.userId);
        return {
          ...comment,
          user: user ? { 
            name: user.name, 
            username: user.username,
            avatarUrl: user.avatarUrl 
          } : null
        };
      }));
      
      res.json(enrichedComments);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar comentários" });
    }
  });
  
  app.post("/api/books/:bookId/comments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const bookId = parseInt(req.params.bookId);
      
      if (isNaN(bookId)) {
        return res.status(400).json({ message: "ID do livro inválido" });
      }
      
      const book = await storage.getBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      const { content, rating } = req.body;
      
      const { data, error } = validateSchema(insertCommentSchema, {
        userId: user.id,
        bookId,
        content,
        rating,
        isApproved: true // Por padrão, comentários são aprovados
      });
      
      if (error) {
        return res.status(400).json({ message: error });
      }
      
      const comment = await storage.createComment(data);
      
      // Enriquecer com dados do usuário
      const userObj = await storage.getUser(user.id);
      const enrichedComment = {
        ...comment,
        user: userObj ? { 
          name: userObj.name, 
          username: userObj.username,
          avatarUrl: userObj.avatarUrl 
        } : null
      };
      
      res.status(201).json(enrichedComment);
    } catch (error) {
      res.status(500).json({ message: "Erro ao adicionar comentário" });
    }
  });
  
  app.post("/api/comments/:id/helpful", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID do comentário inválido" });
      }
      
      const comment = await storage.incrementHelpfulCount(id);
      if (!comment) {
        return res.status(404).json({ message: "Comentário não encontrado" });
      }
      
      res.json(comment);
    } catch (error) {
      res.status(500).json({ message: "Erro ao marcar comentário como útil" });
    }
  });
  
  // Rotas de administração
  app.get("/api/admin/comments", isAdmin, async (req, res) => {
    try {
      const comments = await storage.getAllComments();
      
      // Enriquecer comentários com dados do usuário e livro
      const enrichedComments = await Promise.all(comments.map(async (comment) => {
        const user = await storage.getUser(comment.userId);
        const book = await storage.getBook(comment.bookId);
        return {
          ...comment,
          user: user ? { 
            id: user.id,
            name: user.name, 
            username: user.username 
          } : null,
          book: book ? { 
            id: book.id,
            title: book.title, 
            slug: book.slug 
          } : null
        };
      }));
      
      res.json(enrichedComments);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar comentários" });
    }
  });
  
  app.post("/api/admin/comments/:id/approve", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID do comentário inválido" });
      }
      
      const comment = await storage.approveComment(id);
      if (!comment) {
        return res.status(404).json({ message: "Comentário não encontrado" });
      }
      
      res.json(comment);
    } catch (error) {
      res.status(500).json({ message: "Erro ao aprovar comentário" });
    }
  });
  
  app.delete("/api/admin/comments/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID do comentário inválido" });
      }
      
      const success = await storage.deleteComment(id);
      if (!success) {
        return res.status(404).json({ message: "Comentário não encontrado" });
      }
      
      res.json({ message: "Comentário excluído com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir comentário" });
    }
  });
  
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });
  
  app.put("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID do usuário inválido" });
      }
      
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      const { role } = req.body;
      if (!role || (role !== "user" && role !== "admin")) {
        return res.status(400).json({ message: "Role inválida" });
      }
      
      const updatedUser = await storage.updateUser(id, { role });
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });
  
  app.get("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const userProfile = await storage.getUser(user.id);
      
      if (!userProfile) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Excluir campos sensíveis usando um objeto sem campos sensíveis
      const safeProfile = { ...userProfile };
      if (safeProfile.password) {
        delete safeProfile.password;
      }
      
      res.json(safeProfile);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar perfil" });
    }
  });
  
  app.put("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { name, email, password } = req.body;
      
      // Validar email único se for alterado
      if (email && email !== user.email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ message: "E-mail já está em uso" });
        }
      }
      
      // Atualizar apenas os campos permitidos
      const updatedFields: any = {};
      if (name) updatedFields.name = name;
      if (email) updatedFields.email = email;
      if (password) updatedFields.password = password;
      
      const updatedUser = await storage.updateUser(user.id, updatedFields);
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Excluir campos sensíveis usando um objeto sem campos sensíveis
      const safeUser = { ...updatedUser };
      if (safeUser.password) {
        delete safeUser.password;
      }
      
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
  });
  
  app.post("/api/user/avatar", isAuthenticated, uploadCover.single('avatar'), async (req, res) => {
    try {
      const user = req.user as any;
      
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado ou formato inválido" });
      }
      
      // Construir URL do avatar
      const avatarUrl = `/uploads/${req.file.filename}`;
      
      // Atualizar usuário
      const updatedUser = await storage.updateUser(user.id, { avatarUrl });
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Excluir campos sensíveis usando um objeto sem campos sensíveis
      const safeAvatarUser = { ...updatedUser };
      if (safeAvatarUser.password) {
        delete safeAvatarUser.password;
      }
      
      // Substituir a referência
      updatedUser = safeAvatarUser;
      
      res.json({
        message: "Avatar atualizado com sucesso",
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar avatar" });
    }
  });
  
  // Rota para verificar status de arquivos (debug)
  app.get("/api/debug/file-check", (req, res) => {
    try {
      const filePath = req.query.path as string;
      
      if (!filePath) {
        return res.status(400).send("ERROR: Caminho do arquivo não fornecido");
      }
      
      // Verificar na pasta public
      const publicPath = path.join(process.cwd(), "public", filePath.replace(/^\//, ""));
      
      // Verificar na pasta uploads
      const uploadsPath = path.join(process.cwd(), filePath.replace(/^\//, ""));
      
      let result = "VERIFICAÇÃO DE ARQUIVOS:\n\n";
      
      if (fs.existsSync(publicPath)) {
        const stats = fs.statSync(publicPath);
        result += `Arquivo em public: SIM\n`;
        result += `Tamanho: ${stats.size} bytes\n`;
        result += `Caminho: ${publicPath}\n\n`;
      } else {
        result += `Arquivo em public: NÃO\n\n`;
      }
      
      if (fs.existsSync(uploadsPath)) {
        const stats = fs.statSync(uploadsPath);
        result += `Arquivo em uploads: SIM\n`;
        result += `Tamanho: ${stats.size} bytes\n`;
        result += `Caminho: ${uploadsPath}\n`;
      } else {
        result += `Arquivo em uploads: NÃO\n`;
      }
      
      res.header("Content-Type", "text/plain").send(result);
    } catch (error) {
      console.error("Erro ao verificar arquivo:", error);
      res.status(500).send("Erro ao verificar arquivo: " + String(error));
    }
  });

  // Iniciar servidor HTTP para o Express
  const server = createServer(app);
  
  // Rota para visualização de livros (sem download)
  app.get("/api/books/view/:id/:format", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const format = req.params.format;
      
      console.log(`Requisição para visualização de livro - ID: ${id}, Formato: ${format}`);
      
      if (isNaN(id)) {
        console.log(`ID inválido: ${req.params.id}`);
        return res.status(400).json({ message: "ID inválido" });
      }
      
      if (format !== 'epub' && format !== 'pdf') {
        console.log(`Formato inválido: ${format}`);
        return res.status(400).json({ message: "Formato inválido. Use 'epub' ou 'pdf'" });
      }
      
      const book = await storage.getBook(id);
      console.log(`Livro encontrado:`, book ? `ID: ${book.id}, Título: ${book.title}` : 'Não encontrado');
      
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      // Determinar qual URL de arquivo usar baseado no formato
      let fileUrl = format === 'epub' ? book.epubUrl : book.pdfUrl;
      console.log(`URL do arquivo ${format}: ${fileUrl}`);
      
      if (!fileUrl) {
        return res.status(404).json({ message: `Formato ${format} não disponível para este livro` });
      }
      
      // Determinar o caminho correto do arquivo, considerando nossa nova estrutura de diretórios
      let filePath;
      
      if (fileUrl.startsWith('/uploads/')) {
        // Arquivos em /uploads/ estão diretamente na pasta uploads
        filePath = path.join(uploadsDirectory, fileUrl.replace(/^\/uploads\//, ''));
        console.log(`Verificando arquivo em: ${filePath} (caminho de uploads)`);
      } else if (fileUrl.startsWith('/books/')) {
        // Arquivos em /books/ estão na pasta public/books
        filePath = path.join(booksDirectory, fileUrl.replace(/^\/books\//, ''));
        console.log(`Verificando arquivo em: ${filePath} (caminho de books)`);
      } else {
        // Para outras URLs, procurar na pasta public
        filePath = path.join(publicDirectory, fileUrl.replace(/^\//, ''));
        console.log(`Verificando arquivo em: ${filePath} (caminho padrão)`);
      }
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(filePath)) {
        console.error(`Arquivo não encontrado: ${filePath}`);
        
        // Tentar encontrar em outros locais possíveis como fallback
        const possiblePaths = [
          path.join(uploadsBooksDirectory, path.basename(fileUrl)),
          path.join(booksDirectory, path.basename(fileUrl)),
          path.join(__dirname, '..', fileUrl)
        ];
        
        console.log('Tentando localizar o arquivo em caminhos alternativos...');
        let foundPath = null;
        
        for (const altPath of possiblePaths) {
          console.log(`Verificando: ${altPath}`);
          if (fs.existsSync(altPath)) {
            foundPath = altPath;
            console.log(`Arquivo encontrado em caminho alternativo: ${foundPath}`);
            break;
          }
        }
        
        if (!foundPath) {
          return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
        }
        
        filePath = foundPath;
      }
      
      // Verificar se o arquivo tem conteúdo (tamanho maior que 0)
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        console.error(`Arquivo vazio: ${filePath} (tamanho: ${stats.size} bytes)`);
        return res.status(404).json({ 
          message: "Arquivo sem conteúdo",
          error: "empty_file",
          details: "O arquivo existe no servidor, mas está vazio (0 bytes). Esta é uma limitação do ambiente de demonstração."
        });
      }
      
      console.log(`Arquivo sendo visualizado: ${filePath} (URL: ${fileUrl}, tamanho: ${stats.size} bytes)`);
      
      // Enviar o arquivo com o tipo MIME correto
      res.setHeader('Content-Type', format === 'epub' ? 'application/epub+zip' : 'application/pdf');
      
      // Enviar o arquivo como stream
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Erro na visualização do livro:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Rotas para download de livros
  app.get("/api/books/download/:id/:format", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const format = req.params.format;
      
      console.log(`Requisição para download de livro - ID: ${id}, Formato: ${format}`);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      if (format !== 'epub' && format !== 'pdf') {
        return res.status(400).json({ message: "Formato inválido. Use 'epub' ou 'pdf'" });
      }
      
      const book = await storage.getBook(id);
      console.log(`Livro encontrado:`, book ? `ID: ${book.id}, Título: ${book.title}` : 'Não encontrado');
      
      if (!book) {
        return res.status(404).json({ message: "Livro não encontrado" });
      }
      
      // Determinar qual URL de arquivo usar baseado no formato
      let fileUrl = format === 'epub' ? book.epubUrl : book.pdfUrl;
      console.log(`URL do arquivo ${format}: ${fileUrl}`);
      
      if (!fileUrl) {
        return res.status(404).json({ message: `Formato ${format} não disponível para este livro` });
      }
      
      // Determinar o caminho correto do arquivo, considerando nossa nova estrutura de diretórios
      let filePath;
      
      if (fileUrl.startsWith('/uploads/')) {
        // Arquivos em /uploads/ estão diretamente na pasta uploads
        filePath = path.join(uploadsDirectory, fileUrl.replace(/^\/uploads\//, ''));
        console.log(`Verificando arquivo em: ${filePath} (caminho de uploads)`);
      } else if (fileUrl.startsWith('/books/')) {
        // Arquivos em /books/ estão na pasta public/books
        filePath = path.join(booksDirectory, fileUrl.replace(/^\/books\//, ''));
        console.log(`Verificando arquivo em: ${filePath} (caminho de books)`);
      } else {
        // Para outras URLs, procurar na pasta public
        filePath = path.join(publicDirectory, fileUrl.replace(/^\//, ''));
        console.log(`Verificando arquivo em: ${filePath} (caminho padrão)`);
      }
      
      // Verificar se o arquivo existe
      if (!fs.existsSync(filePath)) {
        console.error(`Arquivo não encontrado: ${filePath}`);
        
        // Tentar encontrar em outros locais possíveis como fallback
        const possiblePaths = [
          path.join(uploadsBooksDirectory, path.basename(fileUrl)),
          path.join(booksDirectory, path.basename(fileUrl)),
          path.join(__dirname, '..', fileUrl)
        ];
        
        console.log('Tentando localizar o arquivo em caminhos alternativos...');
        let foundPath = null;
        
        for (const altPath of possiblePaths) {
          console.log(`Verificando: ${altPath}`);
          if (fs.existsSync(altPath)) {
            foundPath = altPath;
            console.log(`Arquivo encontrado em caminho alternativo: ${foundPath}`);
            break;
          }
        }
        
        if (!foundPath) {
          return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
        }
        
        filePath = foundPath;
      }
      
      // Verificar se o arquivo tem conteúdo (tamanho maior que 0)
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        console.error(`Arquivo vazio: ${filePath} (tamanho: ${stats.size} bytes)`);
        return res.status(404).json({ 
          message: "Arquivo sem conteúdo",
          error: "empty_file",
          details: "O arquivo existe no servidor, mas está vazio (0 bytes). Esta é uma limitação do ambiente de demonstração."
        });
      }
      
      // Incrementar contador de downloads
      await storage.incrementDownloadCount(id);
      
      console.log(`Arquivo sendo baixado: ${filePath} (tamanho: ${stats.size} bytes)`);
      
      // Configurar headers para forçar download
      const fileName = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', format === 'epub' ? 'application/epub+zip' : 'application/pdf');
      
      // Enviar o arquivo
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Erro no download do livro:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Rotas de upload
  app.post('/api/upload/cover', isAuthenticated, uploadCover.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado ou tipo de arquivo inválido' });
      }
      
      // Construir URL para o arquivo
      const coverUrl = `/uploads/covers/${req.file.filename}`;
      
      // Log do upload
      console.log(`Upload de capa concluído: ${req.file.filename}`);
      console.log(`URL da capa: ${coverUrl}`);
      
      res.json({ coverUrl });
    } catch (error) {
      console.error('Erro no upload da capa:', error);
      res.status(500).json({ message: 'Erro no processamento do upload' });
    }
  });
  
  app.post('/api/upload/epub', isAuthenticated, uploadBookFile.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado ou tipo de arquivo inválido' });
      }
      
      // Construir URL para o arquivo (usar a mesma estrutura consistentemente)
      const epubUrl = `/uploads/books/${req.file.filename}`;
      
      // Log do upload
      console.log(`Upload de EPUB concluído: ${req.file.filename}`);
      console.log(`URL do EPUB: ${epubUrl}`);
      
      // Verificar se o arquivo existe no sistema de arquivos
      const filePath = path.join(uploadsBooksDirectory, req.file.filename);
      console.log(`Caminho completo verificado: ${filePath}`);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`Arquivo verificado com sucesso - Tamanho: ${stats.size} bytes`);
        
        // Verificar se é um EPUB válido pelo tamanho mínimo (ao menos um arquivo ZIP válido)
        if (stats.size < 100) {
          console.warn(`Arquivo EPUB inválido ou vazio: ${filePath} (tamanho: ${stats.size} bytes)`);
          return res.status(400).json({ 
            message: "O arquivo enviado parece estar vazio ou corrompido. Tente novamente com outro arquivo."
          });
        }
      } else {
        console.error(`ERRO: Arquivo não encontrado após upload: ${filePath}`);
        return res.status(500).json({ 
          message: "Erro interno ao processar arquivo. O upload falhou." 
        });
      }
      
      res.json({ epubUrl });
    } catch (error) {
      console.error('Erro no upload do EPUB:', error);
      res.status(500).json({ message: 'Erro no processamento do upload' });
    }
  });
  
  app.post('/api/upload/pdf', isAuthenticated, uploadBookFile.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado ou tipo de arquivo inválido' });
      }
      
      // Construir URL para o arquivo (usar a mesma estrutura consistentemente)
      const pdfUrl = `/uploads/books/${req.file.filename}`;
      
      // Log do upload
      console.log(`Upload de PDF concluído: ${req.file.filename}`);
      console.log(`URL do PDF: ${pdfUrl}`);
      
      // Verificar se o arquivo existe no sistema de arquivos
      const filePath = path.join(uploadsBooksDirectory, req.file.filename);
      console.log(`Caminho completo verificado: ${filePath}`);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`Arquivo verificado com sucesso - Tamanho: ${stats.size} bytes`);
        
        // Verificar se é um PDF válido pelo tamanho mínimo
        if (stats.size < 100) {
          console.warn(`Arquivo PDF inválido ou vazio: ${filePath} (tamanho: ${stats.size} bytes)`);
          return res.status(400).json({ 
            message: "O arquivo enviado parece estar vazio ou corrompido. Tente novamente com outro arquivo."
          });
        }
      } else {
        console.error(`ERRO: Arquivo não encontrado após upload: ${filePath}`);
        return res.status(500).json({ 
          message: "Erro interno ao processar arquivo. O upload falhou." 
        });
      }
      
      res.json({ pdfUrl });
    } catch (error) {
      console.error('Erro no upload do PDF:', error);
      res.status(500).json({ message: 'Erro no processamento do upload' });
    }
  });

  return server;
}