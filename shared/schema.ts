import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enumerações
export const roleEnum = pgEnum('role', ['user', 'admin']);
export const bookFormatEnum = pgEnum('book_format', ['epub', 'pdf', 'both']);

// Usuários
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: roleEnum('role').default('user').notNull(),
  avatarUrl: text("avatar_url"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  name: true,
  role: true,
  avatarUrl: true,
});

// Categorias
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  iconName: text("icon_name").notNull(),
  bookCount: integer("book_count").default(0).notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  slug: true,
  iconName: true,
  bookCount: true,
});

// Autores
export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  bio: text("bio"),
  imageUrl: text("image_url"),
});

export const insertAuthorSchema = createInsertSchema(authors).pick({
  name: true,
  slug: true,
  bio: true,
  imageUrl: true,
});

// Séries
export const series = pgTable("series", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  coverUrl: text("cover_url"),
  authorId: integer("author_id").notNull(),
  bookCount: integer("book_count").default(0).notNull(),
});

export const insertSeriesSchema = createInsertSchema(series).pick({
  name: true,
  slug: true,
  description: true,
  coverUrl: true,
  authorId: true,
  bookCount: true,
});

// Livros
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  authorId: integer("author_id").notNull(),
  categoryId: integer("category_id").notNull(),
  description: text("description").notNull(),
  coverUrl: text("cover_url").notNull(),
  epubUrl: text("epub_url"),
  pdfUrl: text("pdf_url"),
  amazonUrl: text("amazon_url"),
  format: bookFormatEnum('format').default('both').notNull(),
  pageCount: integer("page_count"),
  isbn: text("isbn"),
  publishYear: integer("publish_year"),
  publisher: text("publisher"),
  language: text("language").default("pt-BR").notNull(),
  rating: integer("rating").default(0),
  ratingCount: integer("rating_count").default(0),
  downloadCount: integer("download_count").default(0),
  isFeatured: boolean("is_featured").default(false),
  isNew: boolean("is_new").default(false),
  isFree: boolean("is_free").default(false),
  // Campos para séries
  seriesId: integer("series_id"),
  volumeNumber: integer("volume_number"),
});

export const insertBookSchema = createInsertSchema(books).pick({
  title: true,
  slug: true,
  authorId: true,
  categoryId: true,
  description: true,
  coverUrl: true,
  epubUrl: true,
  pdfUrl: true,
  amazonUrl: true,
  format: true,
  pageCount: true,
  isbn: true,
  publishYear: true,
  publisher: true,
  language: true,
  isFeatured: true,
  isNew: true,
  isFree: true,
  seriesId: true,
  volumeNumber: true,
});

// Favoritos
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  bookId: integer("book_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).pick({
  userId: true,
  bookId: true,
});

// Histórico de leitura
export const readingHistory = pgTable("reading_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  bookId: integer("book_id").notNull(),
  progress: integer("progress").default(0).notNull(),
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
  isCompleted: boolean("is_completed").default(false),
});

export const insertReadingHistorySchema = createInsertSchema(readingHistory).pick({
  userId: true,
  bookId: true,
  progress: true,
  isCompleted: true,
});

// Comentários
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  bookId: integer("book_id").notNull(),
  content: text("content").notNull(),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isApproved: boolean("is_approved").default(true),
  helpfulCount: integer("helpful_count").default(0),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  userId: true,
  bookId: true,
  content: true,
  rating: true,
  isApproved: true,
});

// Nova tabela de configurações do site
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").notNull().default("BiblioTech"),
  siteDescription: text("site_description").notNull().default("Sua biblioteca digital"),
  primaryColor: text("primary_color").notNull().default("#3b82f6"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingsSchema = createInsertSchema(siteSettings).pick({
  siteName: true,
  siteDescription: true,
  primaryColor: true,
  logoUrl: true,
  faviconUrl: true,
});


// Tipos exportados
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertAuthor = z.infer<typeof insertAuthorSchema>;
export type Author = typeof authors.$inferSelect;

export type InsertSeries = z.infer<typeof insertSeriesSchema>;
export type Series = typeof series.$inferSelect;

export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

export type InsertReadingHistory = z.infer<typeof insertReadingHistorySchema>;
export type ReadingHistory = typeof readingHistory.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type SiteSettings = typeof siteSettings.$inferSelect;