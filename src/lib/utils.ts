import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num || 0);
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function calcularIdadePet(dataNascimento: string) {
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  const anos = hoje.getFullYear() - nascimento.getFullYear();
  const meses = hoje.getMonth() - nascimento.getMonth();
  const totalMeses = anos * 12 + meses;

  if (totalMeses < 12) return `${totalMeses} ${totalMeses === 1 ? "mês" : "meses"}`;
  const a = Math.floor(totalMeses / 12);
  return `${a} ${a === 1 ? "ano" : "anos"}`;
}

export function especieLabel(especie: string) {
  const map: Record<string, string> = {
    cachorro: "Cachorro",
    gato: "Gato",
    passaro: "Pássaro",
    peixe: "Peixe",
    hamster: "Hamster",
    coelho: "Coelho",
    reptil: "Réptil",
    outro: "Outro",
  };
  return map[especie] ?? especie;
}
