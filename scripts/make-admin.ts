import prisma from '../src/config/database';

async function main() {
  const username = process.argv[2];
  
  if (!username) {
    console.error('Vui lòng cung cấp username: npx.cmd tsx scripts/make-admin.ts <username>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { username }
  });

  if (!user) {
    console.error(`Không tìm thấy user với username: ${username}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { username },
    data: { role: 'ADMIN' }
  });

  console.log(`🎉 Đã cấp quyền ADMIN cho tài khoản: ${username}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
