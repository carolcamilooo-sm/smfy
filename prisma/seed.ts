import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function upsertUser(params: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "OPERATOR";
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  return prisma.user.upsert({
    where: { email: params.email },
    update: {},
    create: {
      name: params.name,
      email: params.email,
      passwordHash,
      role: params.role,
    },
  });
}

async function main() {
  const admin = await upsertUser({
    name: "Admin",
    email: "admin@leadsrecovery.local",
    password: "admin123",
    role: "ADMIN",
  });
  console.log(`Admin: ${admin.email} / senha: admin123`);

  const operatorSeeds = [
    { name: "Operador 1", email: "operador1@leadsrecovery.local" },
    { name: "Operador 2", email: "operador2@leadsrecovery.local" },
  ];

  for (const seed of operatorSeeds) {
    const operator = await upsertUser({
      name: seed.name,
      email: seed.email,
      password: "operador123",
      role: "OPERATOR",
    });
    await prisma.distributionRule.upsert({
      where: { operatorId: operator.id },
      update: {},
      create: {
        operatorId: operator.id,
        weightApproved: 1,
        weightPending: 1,
        weightDeclined: 1,
        active: true,
      },
    });
    console.log(`Operador: ${operator.email} / senha: operador123`);

    await prisma.messageTemplate.upsert({
      where: { id: `seed-template-${operator.id}` },
      update: {},
      create: {
        id: `seed-template-${operator.id}`,
        title: "Boas-vindas",
        content:
          "Olá {{nome}}! Vi que você se interessou por {{produto}} e ficou pendente. Posso te ajudar a finalizar?",
        operatorId: operator.id,
      },
    });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
