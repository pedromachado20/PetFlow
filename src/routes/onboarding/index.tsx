import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/start";
import { useState } from "react";
import { PawPrint, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

const criarPetShop = createServerFn({ method: "POST" })
  .validator(z.object({
    nomePetShop: z.string().min(2),
    email: z.string().email(),
    telefone: z.string().optional(),
    nomeResponsavel: z.string().min(2),
    senha: z.string().min(6),
  }))
  .handler(async ({ data }) => {
    const { db } = await import("~/db");
    const { auth } = await import("~/lib/auth");
    const { tenants, users } = await import("~/db/schema");
    const { eq } = await import("drizzle-orm");

    const { slugify } = await import("~/lib/utils");

    const slug = slugify(data.nomePetShop) + "-" + Math.random().toString(36).slice(2, 6);

    const tenantId = crypto.randomUUID();
    await db.insert(tenants).values({
      id: tenantId,
      nome: data.nomePetShop,
      slug,
      email: data.email,
      telefone: data.telefone,
    });

    const signUpResult = await auth.api.signUpEmail({
      body: {
        name: data.nomeResponsavel,
        email: data.email,
        password: data.senha,
      },
    });

    if (signUpResult.user) {
      await db.update(users)
        .set({ tenantId, role: "owner" })
        .where(eq(users.id, signUpResult.user.id));
    }

    return { ok: true };
  });

export const Route = createFileRoute("/onboarding/")({
  component: OnboardingPage,
});

const steps = ["Pet Shop", "Responsável", "Acesso"];

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nomePetShop: "",
    email: "",
    telefone: "",
    nomeResponsavel: "",
    senha: "",
    confirmarSenha: "",
  });

  function updateForm(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFinish() {
    if (form.senha !== form.confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      await criarPetShop({
        data: {
          nomePetShop: form.nomePetShop,
          email: form.email,
          telefone: form.telefone,
          nomeResponsavel: form.nomeResponsavel,
          senha: form.senha,
        },
      });
      const { signIn } = await import("~/lib/auth-client");
      await signIn.email({ email: form.email, password: form.senha });
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar pet shop");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
            <PawPrint className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Criar conta no PetFlow</h1>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                i < step ? "bg-primary text-primary-foreground" :
                i === step ? "bg-primary/20 text-primary border border-primary" :
                "bg-secondary text-muted-foreground"
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn("text-xs", i === step ? "text-foreground font-medium" : "text-muted-foreground")}>{s}</span>
              {i < steps.length - 1 && <div className="h-px w-8 bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 0 */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome do Pet Shop / Clínica</Label>
              <Input placeholder="Ex: Pet Shop do João" value={form.nomePetShop} onChange={(e) => updateForm("nomePetShop", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="contato@petshop.com" value={form.email} onChange={(e) => updateForm("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone (opcional)</Label>
              <Input placeholder="(11) 99999-9999" value={form.telefone} onChange={(e) => updateForm("telefone", e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => {
              if (!form.nomePetShop || !form.email) { toast.error("Preencha os campos obrigatórios"); return; }
              setStep(1);
            }}>
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Seu nome</Label>
              <Input placeholder="Nome completo" value={form.nomeResponsavel} onChange={(e) => updateForm("nomeResponsavel", e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button className="flex-1" onClick={() => {
                if (!form.nomeResponsavel) { toast.error("Informe seu nome"); return; }
                setStep(2);
              }}>
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={form.senha} onChange={(e) => updateForm("senha", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar senha</Label>
              <Input type="password" placeholder="Repita a senha" value={form.confirmarSenha} onChange={(e) => updateForm("confirmarSenha", e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button className="flex-1" disabled={loading} onClick={handleFinish}>
                {loading ? "Criando..." : "Criar conta"}
              </Button>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta? <a href="/login" className="text-primary hover:underline">Entrar</a>
        </p>
      </div>
    </div>
  );
}
