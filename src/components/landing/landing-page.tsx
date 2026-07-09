import { Link } from "@tanstack/react-router";
import { PawPrint, Check, X, ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { SUBSCRIPTION_PRICE, TRIAL_DAYS } from "~/lib/billing";
import { formatCurrency } from "~/lib/utils";
import { painPoints, features, faq } from "~/lib/landing-content";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <PainSection />
      <FeaturesSection />
      <PlansHighlight />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
        <PawPrint className="h-4 w-4 text-primary" />
      </div>
      <span className="text-lg font-bold">PetFlow</span>
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#funcionalidades" className="hover:text-foreground">
            Funcionalidades
          </a>
          <a href="#preco" className="hover:text-foreground">
            Preço
          </a>
          <a href="#faq" className="hover:text-foreground">
            Perguntas frequentes
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/onboarding">
              Começar grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
      <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
        Feito pra pet shops e clínicas veterinárias
      </span>
      <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
        Pare de perder tempo e dinheiro com caderno, planilha e grupo de WhatsApp
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
        O PetFlow é o sistema completo pra pet shops e clínicas veterinárias: agenda, prontuário,
        vacinas, caixa e financeiro em um só lugar.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link to="/onboarding">
            Começar teste grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          {TRIAL_DAYS} dias grátis, sem cartão de crédito
        </p>
      </div>
    </section>
  );
}

function PainSection() {
  return (
    <section className="border-t border-border bg-card/40 py-20">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          Isso aí embaixo tá acontecendo no seu pet shop?
        </h2>
        <ul className="mx-auto mt-10 max-w-2xl space-y-4">
          {painPoints.map((pain) => (
            <li key={pain} className="flex items-start gap-3">
              <X className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <span className="text-muted-foreground">{pain}</span>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-10 max-w-2xl text-center text-lg">
          Enquanto isso, clientes somem, vacinas atrasam e o fim do mês nunca fecha do jeito que
          deveria.
        </p>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Tudo que seu pet shop precisa, em um só sistema</h2>
          <p className="mt-4 text-muted-foreground">
            Nada de planilha, caderno ou aplicativo separado pra cada coisa.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlansHighlight() {
  return (
    <section className="border-t border-border bg-card/40 py-20">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">
            Fidelize clientes com planos de assinatura
          </h2>
          <p className="mt-4 text-muted-foreground">
            Crie pacotes recorrentes como &quot;Banho Mensal&quot; e venda diretamente aos seus
            tutores. O PetFlow controla os usos de cada assinatura no mês automaticamente, então
            você não precisa anotar quem já usou o quê.
          </p>
        </div>
        <Card className="p-6">
          <p className="text-sm font-medium text-muted-foreground">Exemplo de plano</p>
          <p className="mt-1 text-xl font-bold">Banho Mensal</p>
          <p className="mt-1 text-sm text-muted-foreground">4 banhos por mês</p>
          <p className="mt-4 text-2xl font-bold text-primary">{formatCurrency(120)}/mês</p>
        </Card>
      </div>
    </section>
  );
}

function PricingSection() {
  const pricingFeatures = [
    "Agenda",
    "Tutores & Pets",
    "Prontuário e Vacinas",
    "Produtos",
    "Financeiro",
    "Caixa",
    "Relatórios",
  ];

  return (
    <section id="preco" className="py-20">
      <div className="mx-auto max-w-lg px-6 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Um plano, tudo incluso</h2>
        <p className="mt-4 text-muted-foreground">Sem letra miúda, sem módulo pago à parte.</p>
        <Card className="mt-10 p-8 text-left">
          <p className="text-sm font-medium text-muted-foreground">PetFlow Completo</p>
          <p className="mt-2 text-4xl font-bold">
            {formatCurrency(SUBSCRIPTION_PRICE)}
            <span className="text-base font-normal text-muted-foreground">/mês</span>
          </p>
          <p className="mt-2 text-sm text-primary">
            {TRIAL_DAYS} dias grátis, sem cartão de crédito
          </p>
          <ul className="mt-6 space-y-3">
            {pricingFeatures.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-8 w-full" size="lg">
            <Link to="/onboarding">Começar teste grátis</Link>
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Sem fidelidade — seus dados continuam guardados mesmo se a assinatura ficar em atraso
          </p>
        </Card>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="border-t border-border bg-card/40 py-20">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Perguntas frequentes</h2>
        <Accordion type="single" collapsible className="mt-10">
          {faq.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">
          Organize seu pet shop hoje mesmo
        </h2>
        <p className="mt-4 text-muted-foreground">
          {TRIAL_DAYS} dias grátis, sem cartão de crédito. Cadastro leva menos de 5 minutos.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/onboarding">
            Começar teste grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="footer" className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 text-sm text-muted-foreground sm:flex-row">
        <Logo />
        <p>
          Já é cliente?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl justify-center px-6">
        <a
          href="https://nexusteck.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span className="text-sm font-medium text-muted-foreground">Desenvolvido por</span>
          <img src="/logo-nexusteck.png" alt="NexusTeck" className="h-28 w-auto" />
        </a>
      </div>
    </footer>
  );
}
