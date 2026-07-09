import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  Users,
  Syringe,
  Wallet,
  Repeat,
  LineChart,
  MessageCircle,
  UserCog,
} from "lucide-react";

export const painPoints = [
  "Agenda anotada em caderno ou espalhada em grupo de WhatsApp",
  "Cliente que esquece o horário porque ninguém avisou",
  "Vacina que vence sem ninguém perceber",
  "Caixa fechado \"no olho\", sem saber se sobrou ou faltou dinheiro",
  "Nenhuma ideia de quais serviços realmente dão lucro no fim do mês",
];

export interface LandingFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const features: LandingFeature[] = [
  {
    icon: CalendarCheck,
    title: "Agenda inteligente",
    description:
      "Agendamento por profissional e serviço, com status do atendimento do início ao fim — sem conflito de horário.",
  },
  {
    icon: Users,
    title: "Tutores & Pets com prontuário",
    description:
      "Ficha completa de cada pet: histórico clínico, alergias, castração e tudo mais, vinculado ao tutor.",
  },
  {
    icon: Syringe,
    title: "Controle de vacinas",
    description: "Data de aplicação e próxima dose registradas — nunca mais perca o prazo de um reforço.",
  },
  {
    icon: Wallet,
    title: "Caixa completo",
    description:
      "Fechamento do dia com PIX, cartão e dinheiro, cupom térmico, recibo em PDF e atendimento avulso sem agendamento prévio.",
  },
  {
    icon: Repeat,
    title: "Planos de assinatura pros seus clientes",
    description:
      "Venda pacotes recorrentes (ex.: banho mensal) aos seus tutores e garanta receita previsível todo mês.",
  },
  {
    icon: LineChart,
    title: "Financeiro & Relatórios",
    description: "Receitas, despesas e o ranking dos serviços que mais vendem, tudo consolidado.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp automático (opcional)",
    description: "Confirmação de agendamento, lembrete de horário e aviso de vacina vencendo, quando você quiser.",
  },
  {
    icon: UserCog,
    title: "Equipe organizada",
    description: "Profissionais, horários de trabalho e comissão, tudo em um só lugar.",
  },
];

export interface LandingFaqItem {
  question: string;
  answer: string;
}

export const faq: LandingFaqItem[] = [
  {
    question: "Preciso de cartão de crédito para testar?",
    answer: "Não. Você tem dias grátis para usar o sistema completo, sem informar cartão.",
  },
  {
    question: "Serve pra pet shop ou só pra clínica veterinária?",
    answer:
      "Os dois. O PetFlow cobre desde banho e tosa até prontuário clínico e controle de vacinas.",
  },
  {
    question: "Perco meus dados se atrasar o pagamento?",
    answer: "Não. Seus dados continuam salvos mesmo se a assinatura ficar em atraso.",
  },
  {
    question: "Preciso instalar algo?",
    answer: "Não. O PetFlow funciona direto no navegador, em qualquer computador ou celular.",
  },
  {
    question: "A integração com WhatsApp é obrigatória?",
    answer: "Não, é opcional. Você configura quando quiser, direto nas configurações do sistema.",
  },
  {
    question: "Posso cancelar quando eu quiser?",
    answer: "Sim. Não tem fidelidade.",
  },
];
