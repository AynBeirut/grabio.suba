const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.user.updateMany({
    where: { email: 'demo@aibuilder.local' },
    data: { credits: 10000 }
  })
  console.log('Updated users:', result.count)
  console.log('Demo user now has 10,000 credits')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
