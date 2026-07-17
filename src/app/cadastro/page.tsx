"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SparklesCanvas } from "@/components/sparkles-canvas";
import { registerOperator } from "./actions";

export default function CadastroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
    setError(null);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("email", email);
      formData.set("password", password);
      await registerOperator(formData);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o cadastro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app">
      <SparklesCanvas density={7000} />

      <div className="relative z-10 flex flex-col items-center px-6 py-14">
        <Link href="/" className="mb-16 w-fit" style={{ animation: "fadeUp 0.6s ease-out both" }}>
          <Logo className="h-20" />
        </Link>

        <div
          ref={cardRef}
          data-glow-card=""
          onMouseMove={onCardMouseMove}
          className="relative isolate w-full max-w-[400px] rounded-[20px] border border-border bg-surface/70 p-9 backdrop-blur-md"
        >
          {submitted ? (
            <>
              <h1 className="mb-2.5 text-[32px] font-extrabold tracking-tight text-primary">
                Cadastro enviado
              </h1>
              <p className="mb-9 text-[15px] text-secondary">
                Aguarde a aprovação do administrador. Você vai conseguir
                entrar assim que sua conta for aceita.
              </p>
              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-border px-4 py-3.5 text-[15px] font-semibold text-primary hover:border-accent/50"
              >
                Voltar para o login
              </Link>
            </>
          ) : (
            <>
              <h1
                className="mb-2.5 text-[32px] font-extrabold tracking-tight text-primary"
                style={{ animation: "fadeUp 0.6s ease-out 0.1s both" }}
              >
                Crie sua conta
              </h1>
              <p
                className="mb-9 text-[15px] text-secondary"
                style={{ animation: "fadeUp 0.6s ease-out 0.18s both" }}
              >
                Solicite acesso como operador de atendimento.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div style={{ animation: "fadeUp 0.6s ease-out 0.24s both" }}>
                  <label htmlFor="name" className="mb-2 block text-[13px] font-semibold text-secondary">
                    Nome
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                    autoFocus
                    className="w-full rounded-[10px] border border-border bg-app px-4 py-3.5 text-[15px] text-primary placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>

                <div style={{ animation: "fadeUp 0.6s ease-out 0.3s both" }}>
                  <label htmlFor="email" className="mb-2 block text-[13px] font-semibold text-secondary">
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@empresa.com"
                    required
                    className="w-full rounded-[10px] border border-border bg-app px-4 py-3.5 text-[15px] text-primary placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>

                <div style={{ animation: "fadeUp 0.6s ease-out 0.36s both" }}>
                  <label htmlFor="password" className="mb-2 block text-[13px] font-semibold text-secondary">
                    Senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full rounded-[10px] border border-border bg-app px-4 py-3.5 text-[15px] text-primary focus:border-accent focus:outline-none"
                  />
                </div>

                <div style={{ animation: "fadeUp 0.6s ease-out 0.42s both" }}>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-[13px] font-semibold text-secondary"
                  >
                    Confirmar senha
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full rounded-[10px] border border-border bg-app px-4 py-3.5 text-[15px] text-primary focus:border-accent focus:outline-none"
                  />
                </div>

                {error && <p className="text-sm text-danger">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ animation: "fadeUp 0.6s ease-out 0.48s both" }}
                  className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-accent px-4 py-3.5 text-[15px] font-bold text-app shadow-[0_8px_30px_oklch(0.6_0.25_300_/_0.4)] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Solicitar acesso"}
                </button>

                <p
                  className="text-center text-sm text-secondary"
                  style={{ animation: "fadeUp 0.6s ease-out 0.54s both" }}
                >
                  Já tem conta?{" "}
                  <Link href="/login" className="font-semibold text-accent hover:underline">
                    Entrar
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
