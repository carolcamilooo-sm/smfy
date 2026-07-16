"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/** localhost, loopback e faixas privadas — não alcançáveis a partir do servidor. */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!ipv4) return false;
  const [a, b] = ipv4.slice(1).map(Number);
  if (a === 127 || a === 0 || a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true; // metadata da cloud
  return false;
}

export async function saveAttendWebhookUrl(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("unauthorized");

  const raw = String(formData.get("url") ?? "").trim();

  // Campo vazio desliga o "Atender por hook" em vez de dar erro.
  if (!raw) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { attendWebhookUrl: null },
    });
    revalidatePath("/atendimento/ajustes");
    return;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL inválida");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("A URL precisa começar com http:// ou https://");
  }
  // Quem faz o POST é o servidor, não o navegador do atendente — então um
  // endereço local aponta pra máquina do servidor, não pra dele. Barrar aqui
  // dá um erro claro em vez de um timeout sem explicação, e evita usar o hook
  // pra alcançar a rede interna de onde o app roda.
  if (isPrivateHost(url.hostname)) {
    throw new Error(
      "Endereço local não funciona: o SMFY chama essa URL do servidor dele, não do seu computador. Use uma URL pública da sua extensão."
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { attendWebhookUrl: url.toString() },
  });

  revalidatePath("/atendimento/ajustes");
}
