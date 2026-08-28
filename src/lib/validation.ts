import { z } from "zod";

function normalizarMoeda(bruto: string): string {
  const s = bruto.trim();
  return s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
}

export function zMoeda(mensagem = "Valor inválido") {
  return z.string().min(1, mensagem).transform((v, ctx) => {
    const normalizado = normalizarMoeda(v);
    const num = Number(normalizado);
    if (isNaN(num) || num < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: mensagem });
      return z.NEVER;
    }
    return num.toFixed(2);
  });
}

export function zMoedaOpcional(valorPadrao: string): z.ZodEffects<z.ZodOptional<z.ZodString>, string, string | undefined>;
export function zMoedaOpcional(): z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
export function zMoedaOpcional(valorPadrao?: string) {
  return z.string().optional().transform((v, ctx) => {
    if (!v?.trim()) return valorPadrao;
    const normalizado = normalizarMoeda(v);
    const num = Number(normalizado);
    if (isNaN(num) || num < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valor inválido" });
      return z.NEVER;
    }
    return num.toFixed(2);
  });
}
