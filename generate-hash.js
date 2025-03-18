import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(`Password: ${password}`);
  console.log(`Hashed Password: ${hashedPassword}`);
}

generateHash();