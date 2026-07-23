import prisma from '../src/config/database';
import bcrypt from 'bcrypt';

async function main() {
  const args = process.argv.slice(2);
  const username = args[0];
  const email = args[1];
  const password = args[2] || 'Tingting@123';

  if (!username || !email) {
    console.log('\n❌ Thiếu thông tin!');
    console.log('👉 Cách dùng: npm run create-user <username> <email> [mật_khẩu_tạm]');
    console.log('👉 Ví dụ:    npm run create-user sang sang@gmail.com 123456\n');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      username,
      email,
      password_hash: hashedPassword,
      status: 'require_password_change',
    },
  });

  console.log('\n==================================================');
  console.log('🎉 ĐÃ TẠO TÀI KHOẢN THÀNH CÔNG!');
  console.log(`- Tên đăng nhập: ${user.username}`);
  console.log(`- Email:         ${user.email}`);
  console.log(`- Mật khẩu tạm:  ${password}`);
  console.log('📌 Trạng thái:    Yêu cầu đổi mật khẩu ở lần đăng nhập đầu.');
  console.log('==================================================\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Lỗi tạo tài khoản:', e.message, '\n');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
