import prisma from '../src/config/database';
import bcrypt from 'bcrypt';

async function main() {
  await prisma.user.deleteMany();
  console.log('Deleted all users');
  
  const users = ['quynhgia', 'giathu', 'quockhanh', 'tanphat', 'lienquynh'];
  const password = '123456';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  for (const username of users) {
    await prisma.user.create({
      data: {
        username,
        email: `${username}@tingting.local`,
        password_hash: hashedPassword,
        status: 'active',
      }
    });
    console.log(`Created user ${username} with email ${username}@tingting.local and password 123456`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
