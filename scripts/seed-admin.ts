import prisma from '../src/config/database';
import bcrypt from 'bcrypt';

async function main() {
  const username = 'gqnadmin';
  const password = 'quynhgia11b5';
  const email = 'admin@tingting.vn'; // Dummy email for admin

  const existingUser = await prisma.user.findUnique({
    where: { username }
  });

  if (existingUser) {
    console.log(`Tài khoản ${username} đã tồn tại. Đang cập nhật quyền ADMIN và reset mật khẩu...`);
    const password_hash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { username },
      data: { role: 'ADMIN', password_hash, status: 'active' }
    });
    console.log('✅ Đã cấp quyền ADMIN và cập nhật mật khẩu thành công!');
    return;
  }

  console.log(`Đang tạo tài khoản mới: ${username}...`);
  const password_hash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      username,
      email,
      password_hash,
      role: 'ADMIN',
      status: 'active'
    }
  });

  console.log('✅ Đã tạo tài khoản ADMIN thành công!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
