import { db } from './db';
import { users } from '@shared/schema';
import { hash } from 'bcryptjs';

async function initializeDatabase() {
  try {
    // Criar usuário admin
    const hashedPassword = await hash('admin123', 10);
    await db.insert(users).values({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@elexandria.com',
      name: 'Administrador',
      role: 'admin',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
    });

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    process.exit(0);
  }
}

initializeDatabase();