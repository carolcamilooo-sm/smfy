import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessDashboard } from "@/lib/access";
import { LandingPage } from "@/components/landing-page";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect(canAccessDashboard(session.user.role) ? "/dashboard" : "/atendimento");
  }

  return <LandingPage />;
}
