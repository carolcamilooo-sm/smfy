"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { SparklesCanvas } from "@/components/sparkles-canvas";

const STEPS = [
  {
    title: "Lead chega",
    description:
      "De formulário, anúncio, site ou planilha (CSV/Excel) importada pela equipe.",
  },
  {
    title: "Roteamento inteligente",
    description: "Enviado só para quem está com status online no momento.",
  },
  {
    title: "Atendente assume",
    description:
      "Conversa aberta via API oficial do WhatsApp com o histórico do lead.",
  },
  {
    title: "Métrica registrada",
    description: "Quem chamou, quando e quanto demorou, contabilizado sozinho.",
  },
];

const GATEWAY_LOGOS = [
  { file: "logo-perfectpay.png", alt: "PerfectPay", height: 40 },
  { file: "logo-smpay.png", alt: "SMPay", height: 40 },
  { file: "logo-kirvano.png", alt: "Kirvano", height: 36 },
  { file: "logo-kiwify.png", alt: "Kiwify", height: 40 },
  { file: "logo-appmax.png", alt: "Appmax", height: 36 },
  { file: "logo-disrupty.png", alt: "Disrupty", height: 36 },
  { file: "logo-hotmart.png", alt: "Hotmart", height: 40 },
];

const TEAM_STATUS = [
  { name: "Marina Costa", online: true },
  { name: "Diego Ferreira", online: true },
  { name: "Rafael Souza", online: false },
];

const DISTRIBUTION = [
  { name: "Marina C.", pct: 32, highlight: true },
  { name: "Diego F.", pct: 27 },
  { name: "Ana B.", pct: 23 },
  { name: "Rafael S.", pct: 18 },
];

function useLiveStats() {
  const [stats, setStats] = useState({ leadsHoje: 247, coverage: 93.5, avgResponse: 38 });

  useEffect(() => {
    const id = setInterval(() => {
      setStats((s) => {
        const bump = Math.random() < 0.6;
        const nextLeads = bump ? s.leadsHoje + (Math.random() < 0.7 ? 1 : 2) : s.leadsHoje;
        const covJitter = (Math.random() - 0.45) * 0.4;
        const nextCoverage = Math.max(90, Math.min(97, s.coverage + covJitter));
        const respJitter = Math.round((Math.random() - 0.5) * 4);
        const nextResp = Math.max(28, Math.min(52, s.avgResponse + respJitter));
        return { leadsHoje: nextLeads, coverage: nextCoverage, avgResponse: nextResp };
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return {
    leadsHoje: String(stats.leadsHoje),
    coverage: `${stats.coverage.toFixed(1).replace(".", ",")}%`,
    avgResponse: `${Math.round(stats.avgResponse)}s`,
  };
}

export function LandingPage() {
  const { leadsHoje, coverage, avgResponse } = useLiveStats();
  const cardRef = useRef<HTMLDivElement>(null);

  function onCardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${e.clientX - r.left}px`);
    el.style.setProperty("--gy", `${e.clientY - r.top}px`);
  }

  return (
    <div className="relative overflow-hidden bg-app">
      <SparklesCanvas />

      {/* Nav */}
      <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center border-b border-border px-8 py-5 md:px-16">
        <div className="hidden items-center gap-9 text-sm text-secondary md:flex">
          <span>Produto</span>
          <span>Métricas</span>
          <span>Equipe</span>
          <span>Preços</span>
        </div>
        <Logo className="h-14 justify-self-center" />
        <div className="flex items-center gap-4 justify-self-end">
          <Link href="/login" className="text-sm text-primary/90 hover:text-accent">
            Entrar
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-app"
          >
            Começar agora
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="relative grid grid-cols-1 items-center gap-12 overflow-hidden px-8 py-20 md:grid-cols-2 md:px-16">
        <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-accent/30 blur-3xl" />

        <div className="relative">
          <div className="mb-4 font-mono text-xs text-accent">
            CENTRAL DE LEADS EM TEMPO REAL · INTEGRADO À API DO WHATSAPP
          </div>
          <h1 className="mb-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-primary md:text-5xl">
            Veja cada lead entrar, ser roteado e atendido — ao vivo.
          </h1>
          <p className="mb-9 max-w-md text-lg leading-relaxed text-secondary">
            Roteamento automático só para quem está online no WhatsApp, com
            métricas de volume, distribuição e tempo de resposta minuto a
            minuto.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/login"
              className="rounded-xl bg-accent px-7 py-4 text-base font-bold text-app shadow-[0_8px_30px_oklch(0.6_0.25_300_/_0.4)]"
            >
              Testar grátis por 14 dias
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-border px-7 py-4 text-base font-semibold text-primary"
            >
              Ver demonstração
            </Link>
          </div>
        </div>

        <div
          ref={cardRef}
          data-glow-card=""
          onMouseMove={onCardMouseMove}
          className="relative isolate rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        >
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">Painel ao vivo</span>
            <span className="flex items-center gap-1.5 font-mono text-xs text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              ao vivo
            </span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-app p-4">
              <div className="mb-2 text-xs text-muted">Últimos 60 min</div>
              <div className="font-mono text-2xl font-semibold text-primary">18</div>
            </div>
            <div className="rounded-lg border border-border bg-app p-4">
              <div className="mb-2 text-xs text-muted">Neste minuto</div>
              <div className="font-mono text-2xl font-semibold text-accent">2</div>
            </div>
          </div>

          <div className="flex items-center gap-5 rounded-lg border border-border bg-app p-4">
            <div
              className="h-[90px] w-[90px] shrink-0 rounded-full"
              style={{
                background:
                  "conic-gradient(oklch(0.72 0.25 300) 0% 32%, oklch(0.6 0.2 320) 32% 59%, oklch(0.5 0.15 330) 59% 82%, oklch(0.3 0.05 293) 82% 100%)",
              }}
            />
            <div className="flex flex-1 flex-col gap-1.5 text-xs text-secondary">
              {DISTRIBUTION.map((op) => (
                <div key={op.name} className="flex justify-between">
                  <span>{op.name}</span>
                  <span className={`font-mono ${op.highlight ? "text-accent" : ""}`}>
                    {op.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live KPI strip */}
      <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="bg-app px-8 py-8 md:px-16">
          <div className="mb-2.5 text-sm text-muted">Leads hoje</div>
          <div className="font-mono text-3xl font-semibold text-primary">{leadsHoje}</div>
        </div>
        <div className="bg-app px-8 py-8 md:px-16">
          <div className="mb-2.5 text-sm text-muted">Taxa de cobertura</div>
          <div className="font-mono text-3xl font-semibold text-primary">{coverage}</div>
        </div>
        <div className="bg-app px-8 py-8 md:px-16">
          <div className="mb-2.5 text-sm text-muted">1ª resposta média</div>
          <div className="font-mono text-3xl font-semibold text-primary">{avgResponse}</div>
        </div>
      </div>

      {/* Como funciona */}
      <div className="px-8 py-20 md:px-16">
        <div className="mb-3 font-mono text-xs text-accent">COMO FUNCIONA</div>
        <h2 className="mb-10 max-w-xl text-3xl font-bold tracking-tight text-primary">
          Do lead ao WhatsApp, sem fricção.
        </h2>
        <div className="flex flex-col">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`flex gap-6 py-5 ${
                i < STEPS.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold ${
                  i === 0 ? "bg-accent text-app" : "bg-surface-raised text-primary"
                }`}
              >
                {i + 1}
              </div>
              <div>
                <div className="mb-1 font-semibold text-primary">{step.title}</div>
                <div className="text-sm text-secondary">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integrações marquee */}
      <div className="overflow-hidden border-t border-border py-14">
        <div className="mb-8 px-8 text-center md:px-16">
          <div className="mb-2.5 font-mono text-xs text-accent">INTEGRAÇÕES</div>
          <h2 className="mx-auto mb-2 max-w-xl text-2xl font-bold tracking-tight text-primary">
            Todas as integrações de pagamento que você precisa.
          </h2>
          <p className="mx-auto max-w-lg text-sm text-secondary">
            Reconhecemos venda aprovada em qualquer gateway e associamos
            direto ao lead e ao atendente que converteu.
          </p>
        </div>
        <div className="relative [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
          <div
            className="flex w-max items-center gap-24"
            style={{ animation: "logoMarquee 22s linear infinite" }}
          >
            {[...GATEWAY_LOGOS, ...GATEWAY_LOGOS].map((logo, i) => (
              <Image
                key={`${logo.file}-${i}`}
                src={`/logos/${logo.file}`}
                alt={logo.alt}
                width={140}
                height={logo.height}
                className="w-auto shrink-0 object-contain"
                style={{ height: logo.height }}
                unoptimized
              />
            ))}
          </div>
        </div>
      </div>

      {/* Status da equipe */}
      <div className="relative border-t border-border px-8 py-20 md:px-16">
        <div
          className="absolute right-8 top-14 z-20 hidden items-center gap-3.5 rounded-2xl border border-accent/40 bg-surface px-5 py-4 shadow-2xl md:right-16 md:flex"
          style={{ animation: "toastCycle 8s ease-in-out infinite" }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-success" />
          </div>
          <div>
            <div className="mb-0.5 text-sm font-bold text-primary">Novo lead recebido</div>
            <div className="text-xs text-secondary">
              Atribuído a <span className="font-semibold text-accent">Marina Costa</span> · via
              WhatsApp
            </div>
          </div>
          <div className="ml-2 whitespace-nowrap font-mono text-[11px] text-muted">agora</div>
        </div>

        <div className="mb-3 font-mono text-xs text-accent">STATUS DA EQUIPE</div>
        <h2 className="mb-8 text-3xl font-bold tracking-tight text-primary">
          Só recebe lead quem está disponível.
        </h2>
        <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border bg-border">
          {TEAM_STATUS.map((member) => (
            <div
              key={member.name}
              className="flex items-center justify-between bg-surface px-6 py-4"
              style={{ opacity: member.online ? 1 : 0.55 }}
            >
              <div className="flex items-center gap-3.5">
                <div className="h-[34px] w-[34px] rounded-full bg-surface-raised" />
                <span className="text-sm font-semibold text-primary">{member.name}</span>
              </div>
              <span
                className={`flex items-center gap-1.5 font-mono text-xs ${
                  member.online ? "text-success" : "text-muted"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    member.online ? "bg-success" : "bg-muted"
                  }`}
                />
                {member.online ? "online" : "offline"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA final */}
      <div className="relative overflow-hidden border-t border-border px-8 py-24 text-center md:px-16">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-accent/35 blur-3xl" />
        <h2 className="relative mb-5 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
          Pare de perder lead por lentidão no atendimento.
        </h2>
        <p className="relative mb-9 text-lg text-secondary">
          Configure sua equipe em minutos e comece a metrificar tudo hoje
          mesmo.
        </p>
        <Link
          href="/login"
          className="relative inline-block rounded-xl bg-accent px-9 py-[18px] text-base font-bold text-app shadow-[0_8px_30px_oklch(0.6_0.25_300_/_0.4)]"
        >
          Testar grátis por 14 dias
        </Link>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center justify-between gap-4 border-t border-border px-8 py-9 text-sm text-muted md:flex-row md:px-16">
        <span>© 2026 SMFY — Todos os direitos reservados</span>
        <div className="flex gap-6">
          <span>Privacidade</span>
          <span>Termos</span>
          <span>Contato</span>
        </div>
      </div>
    </div>
  );
}
