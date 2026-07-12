"use client";

import { FormEvent, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/logo";
import { SparklesCanvas } from "@/components/sparkles-canvas";

const ERROR_MESSAGES: Record<string, string> = {
  pending_approval:
    "Seu cadastro ainda está aguardando aprovação do administrador.",
  rejected: "Seu cadastro foi recusado. Fale com o administrador.",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  function onCardMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${e.clientX - r.left}px`);
    el.style.setProperty("--gy", `${e.clientY - r.top}px`);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(
        ERROR_MESSAGES[result.code ?? ""] ?? "E-mail ou senha inválidos."
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app">
      <SparklesCanvas density={7000} />

      <div className="relative z-10 flex flex-col items-center px-6 py-14">
        <Link href="/" className="mb-16 w-fit" style={{ animation: "fadeUp 0.6s ease-out both" }}>
          <Logo className="text-4xl" />
        </Link>

        <div
          ref={cardRef}
          data-glow-card=""
          onMouseMove={onCardMouseMove}
          className="relative isolate w-full max-w-[400px] rounded-[20px] border border-border bg-surface/70 p-9 backdrop-blur-md"
        >
          <h1
            className="mb-2.5 text-[32px] font-extrabold tracking-tight text-primary"
            style={{ animation: "fadeUp 0.6s ease-out 0.1s both" }}
          >
            Bem-vindo de volta
          </h1>
          <p
            className="mb-9 text-[15px] text-secondary"
            style={{ animation: "fadeUp 0.6s ease-out 0.18s both" }}
          >
            Entre para acompanhar seus leads em tempo real.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div style={{ animation: "fadeUp 0.6s ease-out 0.28s both" }}>
              <label
                htmlFor="email"
                className="mb-2 block text-[13px] font-semibold text-secondary"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                required
                autoFocus
                className="w-full rounded-[10px] border border-border bg-app px-4 py-3.5 text-[15px] text-primary placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>

            <div style={{ animation: "fadeUp 0.6s ease-out 0.36s both" }}>
              <label htmlFor="password" className="mb-2 block text-[13px] font-semibold text-secondary">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-[10px] border border-border bg-app px-4 py-3.5 pr-11 text-[15px] text-primary focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-2 text-right text-xs text-muted">
                Esqueceu a senha? Fale com o administrador.
              </p>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ animation: "fadeUp 0.6s ease-out 0.48s both" }}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-accent px-4 py-3.5 text-[15px] font-bold text-app shadow-[0_8px_30px_oklch(0.6_0.25_300_/_0.4)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <p
              className="text-center text-sm text-secondary"
              style={{ animation: "fadeUp 0.6s ease-out 0.54s both" }}
            >
              Ainda não tem conta?{" "}
              <Link href="/cadastro" className="font-semibold text-accent hover:underline">
                Criar conta
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
