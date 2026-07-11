import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LandingPage } from "@/components/landing-page";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect(session.user.role === "ADMIN" ? "/dashboard" : "/atendimento");
  }

  return <LandingPage />;
}
