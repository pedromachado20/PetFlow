import { useRouteContext } from "@tanstack/react-router";
import { LogOut, User } from "lucide-react";
import { signOut } from "~/lib/auth-client";
import { useRouter } from "@tanstack/react-router";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/agenda": "Agenda",
  "/caixa": "Caixa",
  "/tutores": "Tutores",
  "/pets": "Pets",
  "/servicos": "Serviços",
  "/profissionais": "Profissionais",
  "/planos": "Planos",
  "/financeiro": "Financeiro",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
};

export function AppHeader() {
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const title = Object.entries(pageTitles).find(([k]) => pathname.startsWith(k))?.[1] ?? "PetFlow";
  const ctx = useRouteContext({ from: "/_app" }) as { tenantNome?: string; session?: { user?: { name?: string } } };

  async function handleSignOut() {
    await signOut();
    router.navigate({ to: "/login" });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div>
        <h1 className="text-base font-semibold">{title}</h1>
        {ctx.tenantNome && (
          <p className="text-xs text-muted-foreground">{ctx.tenantNome}</p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <User className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium truncate">{ctx.session?.user?.name ?? "Usuário"}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
