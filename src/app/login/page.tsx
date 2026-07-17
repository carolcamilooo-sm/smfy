"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
  inactive: "Sua conta foi desativada. Fale com o administrador.",
};

/** Só o e-mail é guardado — senha nunca. */
const REMEMBERED_EMAIL_KEY = "smfy:remembered-email";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  // Campos não-controlados: o valor vive no DOM. Assim o e-mail lembrado entra
  // sem re-render, e o gerenciador de senhas do navegador consegue preencher —
  // com value controlado por state, o autofill dele é sobrescrito.
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const rememberRef = useRef<HTMLInputElement>(null);

  // Só no cliente: localStorage não existe no servidor.
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (!saved) return;
    if (emailRef.current) emailRef.current.value = saved;
    if (rememberRef.current) rememberRef.current.checked = true;
    passwordRef.current?.focus(); // o e-mail já está lá; falta a senha
  }, []);

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

    const email = emailRef.current?.value ?? "";
    const result = await signIn("credentials", {
      email,
      password: passwordRef.current?.value ?? "",
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(
        ERROR_MESSAGES[result.code ?? ""] ?? "E-mail ou senha inválidos."
      );
      return;
    }

    // Só grava depois do login dar certo — senão guardaria e-mail digitado errado.
    if (rememberRef.current?.checked) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY);

    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app">
      <SparklesCanvas density={7000} />

      <div className="relative z-10 flex flex-col items-center px-6 py-14">
        <Link href="/" className="mb-16 w-fit" style={{ animation: "fadeUp 0.6s ease-out both" }}>
          <Logo className="h-14" />
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
                ref={emailRef}
                name="email"
                type="email"
                placeholder="voce@empresa.com"
                required
                autoFocus
                autoComplete="username"
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
                  ref={passwordRef}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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
              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-secondary">
                  <input
                    type="checkbox"
                    ref={rememberRef}
                    name="remember"
                    className="h-3.5 w-3.5 accent-[oklch(0.6_0.25_300)]"
                  />
                  Lembrar meu e-mail
                </label>
                <p className="text-right text-xs text-muted">
                  Esqueceu a senha? Fale com o administrador.
                </p>
              </div>
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
