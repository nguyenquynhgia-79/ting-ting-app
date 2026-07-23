import prisma from '../src/config/database';
import bcrypt from 'bcrypt';

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@tingting.app',
      password_hash: hashedPassword,
      status: 'require_password_change',
    },
  });

  console.log('Test user created:', user.username);
  console.log('Password: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
