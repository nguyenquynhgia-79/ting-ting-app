import prisma from '../src/config/database';
import bcrypt from 'bcrypt';

async function main() {
  const hashedPassword = await bcrypt.hash('user123', 10);
  
  const user = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      email: 'testuser@tingting.app',
      password_hash: hashedPassword,
      status: 'active',
    },
  });

  console.log('Second test user created:', user.username);
  console.log('Password: user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
