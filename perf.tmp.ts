import { prisma } from "./src/lib/db";
async function t(label:string, fn:()=>Promise<any>) {
  const t0=Date.now();
  try { const r=await fn(); console.log(`${label}: ${Date.now()-t0}ms`); return r; }
  catch(e:any){ console.log(`${label}: ERRO ${Date.now()-t0}ms ${e.message}`); }
}
async function main() {
  await t("count users (2a vez)", ()=>prisma.user.count());
  await t("count users (3a vez)", ()=>prisma.user.count());
  const { getSalesRanking, getSalesLeaderboard, getOperatorData } = await import("./src/lib/queries");
  await t("getSalesRanking today", ()=>getSalesRanking({ period: "today" }));
  await t("getSalesLeaderboard today", ()=>getSalesLeaderboard({ period: "today" }));
  const lucas = await prisma.user.findFirst({ where: { name: { contains: "lucas", mode:"insensitive" } }, select: { id: true } });
  if (lucas) await t("getOperatorData (Lucas, 243 leads)", ()=>getOperatorData(lucas.id));
}
main().finally(()=>prisma.$disconnect());
