import type { NextConfig } from "next";

// Headers de segurança aplicados a todas as rotas. Não incluímos uma CSP
// completa (script/style/connect) de propósito: ela precisa ser afinada e
// testada contra Next inline scripts, Tailwind e o websocket do Pusher, senão
// quebra a tela. Por ora a CSP só bloqueia enquadrar o app (anti-clickjacking),
// o que é seguro e não restringe nada da página.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
