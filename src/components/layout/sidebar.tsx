import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarDays, Users, PawPrint, Scissors,
  UserCheck, DollarSign, BarChart3, Settings, ChevronLeft,
  ChevronRight, CreditCard, Receipt, ShoppingBag, HelpCircle,
} from "lucide-react";
import { cn } from "~/lib/utils";

const navItems = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard",  to: "/dashboard" },
      { icon: CalendarDays,    label: "Agenda",     to: "/agenda" },
      { icon: Receipt,         label: "Caixa",      to: "/caixa" },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { icon: Users,       label: "Tutores",  to: "/tutores" },
      { icon: PawPrint,    label: "Pets",     to: "/pets" },
      { icon: ShoppingBag, label: "Produtos", to: "/produtos" },
    ],
  },
  {
    label: "Serviços",
    items: [
      { icon: Scissors,   label: "Serviços",       to: "/servicos" },
      { icon: UserCheck,  label: "Profissionais",  to: "/profissionais" },
      { icon: CreditCard, label: "Planos",         to: "/planos" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { icon: DollarSign,   label: "Financeiro",    to: "/financeiro" },
      { icon: BarChart3,    label: "Relatórios",    to: "/relatorios" },
      { icon: Settings,     label: "Configurações", to: "/configuracoes" },
      { icon: HelpCircle,   label: "Ajuda",         to: "/ajuda" },
    ],
  },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouterState();
  const pathname = router.location.pathname;

  return (
    <aside className={cn("relative flex flex-col border-r border-border bg-card transition-all duration-300", collapsed ? "w-16" : "w-56")}>
      <div className={cn("flex items-center border-b border-border", collapsed ? "justify-center p-4" : "px-4 py-4 gap-2")}>
        <PawPrint className="h-7 w-7 text-primary shrink-0" />
        {!collapsed && <span className="text-lg font-bold text-foreground">PetFlow</span>}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {navItems.map((group) => (
          <div key={group.label} className="mb-2">
            {!collapsed && (
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 mx-2 px-2 py-2 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-colors shadow-sm"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
