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

  const server = createServer(app);
  return server;
}