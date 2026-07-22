import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Serverless atrás do pooler compartilhado do Supabase (Supavisor, modo
// transaction): CADA instância da função abre seu próprio pool. Sem teto, o pg
// assume 10 por instância, e com muitas instâncias (operadores + webhooks +
// admin) o total estoura o pooler — que passa a recusar conexão ("08006 auth
// did not complete" / "ECHECKOUTTIMEOUT"), e toda página que lê banco cai.
//
// Teto baixo por instância mantém o total sob controle; idle curto devolve a
// conexão pro pooler rápido; e connectionTimeout curto faz a função falhar em
// segundos em vez de segurar 15s uma conexão que não vem — o que só alimentava
// a fila e o efeito cascata.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 8_000,
});

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
