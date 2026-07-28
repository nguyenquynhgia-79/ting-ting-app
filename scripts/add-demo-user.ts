import prisma from '../src/config/database';
import bcrypt from 'bcrypt';

async function main() {
  const username = 'demo';
  const password = '123';
  const email = 'demo@tingting.vn';

  // Check if exists
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] }
  });

  if (existing) {
    console.log(`User ${username} already exists!`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  await prisma.user.create({
    data: {
      username,
      email,
      password_hash: hashedPassword,
      status: 'active',
      bank_name: 'MB Bank',
      account_number: '123456789',
      account_name: 'DEMO ACCOUNT'
    }
  });
  
  console.log(`\n🎉 TẠO TÀI KHOẢN DEMO THÀNH CÔNG!`);
  console.log(`Tài khoản: ${username}`);
  console.log(`Mật khẩu: ${password}`);
  console.log(`----------------------------------\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
