import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { LandingPage } from "~/components/landing/landing-page";

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const [{ getWebRequest }, { auth }] = await Promise.all([
    import("@tanstack/start/server"),
    import("~/lib/auth"),
  ]);
  const req = getWebRequest();
  if (!req) return false;
  const session = await auth.api.getSession({ headers: req.headers });
  return !!session;
});

const title = "PetFlow — Gestão completa para Pet Shops e Clínicas Veterinárias";
const description =
  "Agenda, prontuário, vacinas, caixa e financeiro em um só sistema. 7 dias grátis, sem cartão de crédito.";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const isAuth = await checkAuth();
    if (isAuth) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});
