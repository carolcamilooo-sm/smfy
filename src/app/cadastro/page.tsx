"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { MascotCluster } from "../login/mascots";
import { Logo } from "@/components/logo";
import { registerOperator } from "./actions";

export default function CadastroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
              Cadastro de operador
            </span>
          </div>

          {submitted ? (
            <>
              <h1 className="text-2xl font-semibold text-primary">
                Cadastro <span className="text-accent">enviado.</span>
              </h1>
              <p className="mt-3 text-sm text-secondary">
                Aguarde a aprovação do administrador. Você vai conseguir
                entrar assim que sua conta for aceita.
              </p>
              <Link
                href="/login"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold text-primary hover:border-accent/50"
              >
                Voltar para o login
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-primary">
                Crie sua <span className="text-accent">conta.</span>
              </h1>
              <p className="mt-1 text-sm text-secondary">
                Solicite acesso como operador de atendimento.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-xs font-medium tracking-wide text-secondary"
                  >
                    NOME
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                    autoFocus
                    className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>

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
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-primary focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-1.5 block text-xs font-medium tracking-wide text-secondary"
                  >
                    CONFIRMAR SENHA
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-primary focus:border-accent focus:outline-none"
                  />
                </div>

                {error && <p className="text-sm text-danger">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-app transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Solicitar acesso"}
                  {!loading && <span aria-hidden>→</span>}
                </button>

                <p className="text-center text-xs text-muted">
                  Já tem conta?{" "}
                  <Link href="/login" className="text-accent hover:underline">
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
