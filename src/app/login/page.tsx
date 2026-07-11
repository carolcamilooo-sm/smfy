"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { MascotCluster } from "./mascots";
import { Logo } from "@/components/logo";

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
    <div className="flex min-h-screen bg-app">
      {/* Left: brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-app p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.14) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative z-10">
          <Logo className="text-2xl" />
        </div>

        <div className="relative z-10 pb-10">
          <MascotCluster />
        </div>

        <div className="relative z-10 flex gap-4 text-xs text-muted">
          <span>smfy.io</span>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="flex w-full flex-col items-center justify-center bg-app px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 inline-flex rounded-full border border-border bg-surface p-1 text-sm">
            <span className="rounded-full bg-accent px-4 py-1.5 font-medium text-app">
              Entrar
            </span>
          </div>

          <h1 className="text-2xl font-semibold text-primary">
            Bem-vindo <span className="text-accent">de volta.</span>
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Acesse seu hub de recuperação de vendas.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium tracking-wide text-secondary"
              >
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoFocus
                className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium tracking-wide text-secondary"
              >
                SENHA
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-surface px-4 py-3 pr-11 text-sm text-primary focus:border-accent focus:outline-none"
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
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-app transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Entrando..." : "Entrar"}
              {!loading && <span aria-hidden>→</span>}
            </button>

            <p className="text-center text-xs text-muted">
              Ainda não tem conta?{" "}
              <Link href="/cadastro" className="text-accent hover:underline">
                Cadastre-se
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
