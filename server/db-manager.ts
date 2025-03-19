import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { setTimeout } from 'timers/promises';

// Configurações de retry e conexão
const MAX_RETRIES = parseInt(process.env.DB_MAX_RETRIES || '5');
const INITIAL_RETRY_DELAY = parseInt(process.env.DB_INITIAL_RETRY_DELAY || '1000');
const MAX_RETRY_DELAY = parseInt(process.env.DB_MAX_RETRY_DELAY || '30000');
const CONNECTION_TIMEOUT = parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000');
const HEALTH_CHECK_INTERVAL = parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000');

class DatabaseManager {
  private static instance: DatabaseManager;
  private client: postgres.Sql | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private connectionAttempts = 0;
  private isConnecting = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: Date | null = null;

  private constructor() {
    this.setupHealthCheck();
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private calculateRetryDelay(): number {
    // Exponential backoff com jitter
    const exponentialDelay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, this.connectionAttempts),
      MAX_RETRY_DELAY
    );
    // Adiciona um jitter de até 25% para evitar thundering herd
    const jitter = Math.random() * 0.25 * exponentialDelay;
    return exponentialDelay + jitter;
  }

  private setupHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.healthCheck();
    }, HEALTH_CHECK_INTERVAL);

    // Cleanup no shutdown
    process.on('SIGTERM', () => {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
    });
  }

  async connect(): Promise<ReturnType<typeof drizzle>> {
    if (this.db) return this.db;

    if (this.isConnecting) {
      console.log('Conexão já está em andamento, aguardando...');
      while (this.isConnecting) {
        await setTimeout(100);
      }
      if (this.db) return this.db;
    }

    this.isConnecting = true;
    const startTime = Date.now();

    try {
      while (this.connectionAttempts < MAX_RETRIES) {
        try {
          console.log(`Tentativa de conexão ${this.connectionAttempts + 1}/${MAX_RETRIES}`, {
            elapsedTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
          });

          if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL não está definida');
          }

          this.client = postgres(process.env.DATABASE_URL, {
            max: 10,
            idle_timeout: 20,
            connect_timeout: CONNECTION_TIMEOUT,
            max_lifetime: 60 * 30, // 30 minutos
          });

          // Teste de conexão com timeout
          const connectPromise = this.client.connect();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(CONNECTION_TIMEOUT).then(() => 
              reject(new Error('Timeout na conexão'))
            );
          });

          await Promise.race([connectPromise, timeoutPromise]);

          console.log('Conexão estabelecida com sucesso', {
            attempt: this.connectionAttempts + 1,
            duration: Date.now() - startTime
          });

          this.db = drizzle(this.client);
          this.connectionAttempts = 0;
          this.lastHealthCheck = new Date();
          return this.db;

        } catch (error) {
          this.connectionAttempts++;
          const delay = this.calculateRetryDelay();

          console.error(`Erro na tentativa ${this.connectionAttempts}:`, {
            error: error.message,
            stack: error.stack,
            attempt: this.connectionAttempts,
            nextDelay: delay,
            totalElapsed: Date.now() - startTime
          });

          if (this.connectionAttempts >= MAX_RETRIES) {
            throw new Error(`Falha após ${MAX_RETRIES} tentativas de conexão: ${error.message}`);
          }

          await setTimeout(delay);

          // Limpa recursos da tentativa falha
          if (this.client) {
            try {
              await this.client.end();
              console.log('Conexão falha limpa com sucesso');
            } catch (endError) {
              console.error('Erro ao limpar conexão falha:', endError);
            }
            this.client = null;
          }
        }
      }

      throw new Error('Falha ao conectar ao banco de dados após todas as tentativas');
    } finally {
      this.isConnecting = false;
    }
  }

  async healthCheck(): Promise<boolean> {
    const startTime = Date.now();
    try {
      if (!this.db || !this.client) {
        console.log('Health check falhou: cliente não inicializado');
        return false;
      }

      // Tenta executar uma query simples com timeout
      const queryPromise = this.client.query('SELECT 1');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(5000).then(() => reject(new Error('Health check timeout')));
      });

      await Promise.race([queryPromise, timeoutPromise]);

      this.lastHealthCheck = new Date();
      console.log('Health check bem sucedido', {
        duration: Date.now() - startTime,
        lastCheck: this.lastHealthCheck
      });

      return true;
    } catch (error) {
      console.error('Erro no health check:', {
        error: error.message,
        duration: Date.now() - startTime,
        lastSuccessfulCheck: this.lastHealthCheck
      });

      // Se o health check falhar, tenta reconectar
      this.db = null;
      this.client = null;
      await this.connect();

      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      if (this.client) {
        await this.client.end();
        this.client = null;
        this.db = null;
        console.log('Desconectado do banco de dados com sucesso');
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      throw error;
    }
  }
}

export const dbManager = DatabaseManager.getInstance();