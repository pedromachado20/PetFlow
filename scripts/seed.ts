#!/usr/bin/env bun
/**
 * Seed script — popula o banco com dados de teste realistas.
 * Execute: bun scripts/seed.ts
 * Requer que o onboarding tenha sido feito (tenant existente no banco).
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import {
  tenants, professionals, workingHours, services, tutores, pets,
  plans, assinaturas, appointments, vacinas, prontuarios, transacoes,
} from "../src/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL não encontrado. Verifique o .env");
  process.exit(1);
}

const db = drizzle(neon(DATABASE_URL));
const uid = () => crypto.randomUUID();

async function main() {
  /* ── tenant ────────────────────────────────────────────────────────── */
  const [tenant] = await db.select().from(tenants).limit(1);
  if (!tenant) {
    console.error("❌  Nenhum tenant encontrado. Faça o onboarding primeiro.");
    process.exit(1);
  }
  const tid = tenant.id;
  console.log(`\n✅  Tenant: ${tenant.nome}\n`);

  /* ── limpeza ───────────────────────────────────────────────────────── */
  console.log("🗑️   Limpando dados anteriores...");
  await db.delete(transacoes).where(eq(transacoes.tenantId, tid));
  await db.delete(prontuarios).where(eq(prontuarios.tenantId, tid));
  await db.delete(vacinas).where(eq(vacinas.tenantId, tid));
  await db.delete(appointments).where(eq(appointments.tenantId, tid));
  await db.delete(assinaturas).where(eq(assinaturas.tenantId, tid));
  await db.delete(pets).where(eq(pets.tenantId, tid));
  await db.delete(tutores).where(eq(tutores.tenantId, tid));
  await db.delete(plans).where(eq(plans.tenantId, tid));
  await db.delete(services).where(eq(services.tenantId, tid));
  await db.delete(workingHours).where(eq(workingHours.tenantId, tid));
  await db.delete(professionals).where(eq(professionals.tenantId, tid));

  /* ── profissionais ─────────────────────────────────────────────────── */
  console.log("👨‍⚕️  Criando profissionais...");

  const proIds = { carlos: uid(), beatriz: uid(), lucas: uid(), ana: uid() };

  await db.insert(professionals).values([
    {
      id: proIds.carlos, tenantId: tid,
      nome: "Dr. Carlos Mendes", especialidade: "veterinario",
      telefone: "(11) 99201-3344", email: "carlos@petflow.dev",
      crmv: "CRMV-SP 12345", comissao: "40",
    },
    {
      id: proIds.beatriz, tenantId: tid,
      nome: "Beatriz Lima", especialidade: "tosador",
      telefone: "(11) 98877-5566", email: "beatriz@petflow.dev",
      comissao: "35",
    },
    {
      id: proIds.lucas, tenantId: tid,
      nome: "Lucas Santos", especialidade: "banhista",
      telefone: "(11) 97766-1122", email: "lucas@petflow.dev",
      comissao: "30",
    },
    {
      id: proIds.ana, tenantId: tid,
      nome: "Ana Paula Costa", especialidade: "recepcao",
      telefone: "(11) 95544-7788", email: "ana@petflow.dev",
      comissao: "0",
    },
  ]);

  // horários de trabalho
  const diasUteis = ["segunda", "terca", "quarta", "quinta", "sexta"];
  const whRows = [];
  for (const profId of [proIds.carlos, proIds.beatriz, proIds.lucas]) {
    for (const dia of diasUteis) {
      whRows.push({ id: uid(), tenantId: tid, professionalId: profId, diaSemana: dia, horaInicio: "08:00", horaFim: "18:00" });
    }
    whRows.push({ id: uid(), tenantId: tid, professionalId: profId, diaSemana: "sabado", horaInicio: "08:00", horaFim: "13:00" });
  }
  await db.insert(workingHours).values(whRows);

  /* ── serviços ──────────────────────────────────────────────────────── */
  console.log("✂️   Criando serviços...");

  const svcIds = { banhoPeq: uid(), banhoMed: uid(), banhoGrd: uid(), tosaComp: uid(), consulta: uid(), vacina: uid(), cirugia: uid() };

  await db.insert(services).values([
    { id: svcIds.banhoPeq, tenantId: tid, nome: "Banho (pequeno porte)", categoria: "banho_tosa", preco: "45.00", duracao: 60 },
    { id: svcIds.banhoMed, tenantId: tid, nome: "Banho (médio porte)",   categoria: "banho_tosa", preco: "65.00", duracao: 75 },
    { id: svcIds.banhoGrd, tenantId: tid, nome: "Banho (grande porte)",  categoria: "banho_tosa", preco: "90.00", duracao: 90 },
    { id: svcIds.tosaComp, tenantId: tid, nome: "Tosa completa",         categoria: "banho_tosa", preco: "80.00", duracao: 90 },
    { id: svcIds.consulta, tenantId: tid, nome: "Consulta veterinária",  categoria: "veterinaria", preco: "150.00", duracao: 45 },
    { id: svcIds.vacina,   tenantId: tid, nome: "Vacinação",             categoria: "veterinaria", preco: "80.00",  duracao: 30 },
    { id: svcIds.cirugia,  tenantId: tid, nome: "Castração",             categoria: "cirurgia",    preco: "450.00", duracao: 120 },
  ]);

  /* ── planos ────────────────────────────────────────────────────────── */
  console.log("📋  Criando planos...");

  const planIds = { higiene: uid(), saude: uid(), premium: uid() };

  await db.insert(plans).values([
    {
      id: planIds.higiene, tenantId: tid,
      nome: "Plano Higiene", tipo: "limitado", limite: 2,
      preco: "120.00", cor: "#0ea5e9",
      descricao: "2 banhos + tosas por mês. Ideal para cães e gatos de porte pequeno.",
    },
    {
      id: planIds.saude, tenantId: tid,
      nome: "Plano Saúde", tipo: "limitado", limite: 1,
      preco: "180.00", cor: "#10b981",
      descricao: "1 consulta veterinária + vacinação anual por mês. Inclui desconto em exames.",
    },
    {
      id: planIds.premium, tenantId: tid,
      nome: "Plano Premium", tipo: "premium", limite: null,
      preco: "320.00", cor: "#8b5cf6",
      descricao: "Banhos e tosas ilimitados + 1 consulta mensal + desconto em cirurgias.",
    },
  ]);

  /* ── tutores ───────────────────────────────────────────────────────── */
  console.log("👤  Criando tutores...");

  const tutIds = {
    mariana: uid(), rodrigo: uid(), camila: uid(), felipe: uid(), patricia: uid(),
    joao: uid(), amanda: uid(), thiago: uid(), renata: uid(), gustavo: uid(),
  };

  await db.insert(tutores).values([
    { id: tutIds.mariana,  tenantId: tid, nome: "Mariana Oliveira",    email: "mariana@email.com",  telefone: "(11) 99811-0011", cpf: "123.456.789-00", cidade: "São Paulo",    estado: "SP" },
    { id: tutIds.rodrigo,  tenantId: tid, nome: "Rodrigo Ferreira",    email: "rodrigo@email.com",  telefone: "(11) 98722-1122", cpf: "234.567.890-11", cidade: "São Paulo",    estado: "SP" },
    { id: tutIds.camila,   tenantId: tid, nome: "Camila Sousa",        email: "camila@email.com",   telefone: "(11) 97633-2233", cpf: "345.678.901-22", cidade: "Guarulhos",    estado: "SP" },
    { id: tutIds.felipe,   tenantId: tid, nome: "Felipe Almeida",      email: "felipe@email.com",   telefone: "(11) 96544-3344", cpf: "456.789.012-33", cidade: "Osasco",       estado: "SP" },
    { id: tutIds.patricia, tenantId: tid, nome: "Patrícia Nascimento",  email: "patricia@email.com", telefone: "(11) 95455-4455", cpf: "567.890.123-44", cidade: "São Bernardo", estado: "SP" },
    { id: tutIds.joao,     tenantId: tid, nome: "João Carlos Pereira",  email: "joao@email.com",     telefone: "(11) 94366-5566", cpf: "678.901.234-55", cidade: "Santo André",  estado: "SP" },
    { id: tutIds.amanda,   tenantId: tid, nome: "Amanda Ribeiro",       email: "amanda@email.com",   telefone: "(11) 93277-6677", cpf: "789.012.345-66", cidade: "Mauá",         estado: "SP" },
    { id: tutIds.thiago,   tenantId: tid, nome: "Thiago Martins",       email: "thiago@email.com",   telefone: "(11) 92188-7788", cpf: "890.123.456-77", cidade: "São Paulo",    estado: "SP" },
    { id: tutIds.renata,   tenantId: tid, nome: "Renata Gonçalves",     email: "renata@email.com",   telefone: "(11) 91099-8899", cpf: "901.234.567-88", cidade: "São Paulo",    estado: "SP" },
    { id: tutIds.gustavo,  tenantId: tid, nome: "Gustavo Ramos",        email: "gustavo@email.com",  telefone: "(11) 90900-9900", cpf: "012.345.678-99", cidade: "Carapicuíba",  estado: "SP" },
  ]);

  /* ── pets ──────────────────────────────────────────────────────────── */
  console.log("🐾  Criando pets...");

  const petIds = {
    thor: uid(), mel: uid(), luna: uid(), bob: uid(), nina: uid(),
    rex: uid(), mia: uid(), duke: uid(), bella: uid(), leo: uid(),
    pingo: uid(), coco: uid(), nala: uid(), kiko: uid(), amora: uid(),
  };

  await db.insert(pets).values([
    { id: petIds.thor,  tenantId: tid, tutorId: tutIds.mariana,  nome: "Thor",   especie: "cachorro", raca: "Golden Retriever",  sexo: "macho",  porte: "grande",   dataNascimento: "2021-03-15", peso: "28.5", cor: "dourado",   castrado: true  },
    { id: petIds.mel,   tenantId: tid, tutorId: tutIds.mariana,  nome: "Mel",    especie: "gato",     raca: "Persa",             sexo: "femea",  porte: "pequeno",  dataNascimento: "2022-07-20", peso: "4.2",  cor: "branco",    castrado: true  },
    { id: petIds.luna,  tenantId: tid, tutorId: tutIds.rodrigo,  nome: "Luna",   especie: "cachorro", raca: "Border Collie",     sexo: "femea",  porte: "medio",    dataNascimento: "2020-11-05", peso: "18.0", cor: "preto/branco", castrado: false },
    { id: petIds.bob,   tenantId: tid, tutorId: tutIds.camila,   nome: "Bob",    especie: "cachorro", raca: "Bulldog Francês",   sexo: "macho",  porte: "pequeno",  dataNascimento: "2023-02-10", peso: "10.5", cor: "tigrado",   castrado: false },
    { id: petIds.nina,  tenantId: tid, tutorId: tutIds.felipe,   nome: "Nina",   especie: "gato",     raca: "Siamês",            sexo: "femea",  porte: "pequeno",  dataNascimento: "2021-09-12", peso: "3.8",  cor: "creme/marrom", castrado: true },
    { id: petIds.rex,   tenantId: tid, tutorId: tutIds.patricia, nome: "Rex",    especie: "cachorro", raca: "Pastor Alemão",     sexo: "macho",  porte: "grande",   dataNascimento: "2019-05-20", peso: "32.0", cor: "preto/marrom", castrado: false },
    { id: petIds.mia,   tenantId: tid, tutorId: tutIds.patricia, nome: "Mia",    especie: "cachorro", raca: "Shih Tzu",          sexo: "femea",  porte: "mini",     dataNascimento: "2022-12-01", peso: "5.5",  cor: "branco",    castrado: true  },
    { id: petIds.duke,  tenantId: tid, tutorId: tutIds.joao,     nome: "Duke",   especie: "cachorro", raca: "Labrador",          sexo: "macho",  porte: "grande",   dataNascimento: "2020-08-18", peso: "30.0", cor: "caramelo",  castrado: true  },
    { id: petIds.bella, tenantId: tid, tutorId: tutIds.amanda,   nome: "Bella",  especie: "gato",     raca: "SRD",               sexo: "femea",  porte: "pequeno",  dataNascimento: "2023-04-22", peso: "3.5",  cor: "laranja",   castrado: true, alergias: "Sensível a ração com frango" },
    { id: petIds.leo,   tenantId: tid, tutorId: tutIds.thiago,   nome: "Leo",    especie: "cachorro", raca: "Poodle",            sexo: "macho",  porte: "pequeno",  dataNascimento: "2021-01-30", peso: "7.0",  cor: "bege",      castrado: false },
    { id: petIds.pingo, tenantId: tid, tutorId: tutIds.renata,   nome: "Pingo",  especie: "cachorro", raca: "Dachshund",         sexo: "macho",  porte: "pequeno",  dataNascimento: "2022-06-15", peso: "8.5",  cor: "marrom",    castrado: false },
    { id: petIds.coco,  tenantId: tid, tutorId: tutIds.renata,   nome: "Coco",   especie: "passaro",  raca: "Calopsita",         sexo: "macho",  porte: "mini",     dataNascimento: "2023-03-10", peso: "0.1",  cor: "cinza/amarelo", castrado: false },
    { id: petIds.nala,  tenantId: tid, tutorId: tutIds.gustavo,  nome: "Nala",   especie: "gato",     raca: "Maine Coon",        sexo: "femea",  porte: "medio",    dataNascimento: "2020-10-08", peso: "6.0",  cor: "tigrado",   castrado: true  },
    { id: petIds.kiko,  tenantId: tid, tutorId: tutIds.gustavo,  nome: "Kiko",   especie: "coelho",   raca: "Angorá",            sexo: "macho",  porte: "mini",     dataNascimento: "2024-01-05", peso: "1.8",  cor: "branco",    castrado: false },
    { id: petIds.amora, tenantId: tid, tutorId: tutIds.rodrigo,  nome: "Amora",  especie: "cachorro", raca: "Lhasa Apso",        sexo: "femea",  porte: "pequeno",  dataNascimento: "2021-05-28", peso: "6.0",  cor: "dourado",   castrado: true  },
  ]);

  /* ── assinaturas ───────────────────────────────────────────────────── */
  console.log("📄  Criando assinaturas...");

  const assIds = { a1: uid(), a2: uid(), a3: uid(), a4: uid(), a5: uid(), a6: uid() };

  await db.insert(assinaturas).values([
    { id: assIds.a1, tenantId: tid, tutorId: tutIds.mariana,  petId: petIds.thor,  planId: planIds.premium, status: "ativa",       dataInicio: "2026-01-10", dataVencimento: "2026-07-10", usosNoMes: 1 },
    { id: assIds.a2, tenantId: tid, tutorId: tutIds.mariana,  petId: petIds.mel,   planId: planIds.higiene, status: "ativa",       dataInicio: "2026-02-01", dataVencimento: "2026-07-01", usosNoMes: 0 },
    { id: assIds.a3, tenantId: tid, tutorId: tutIds.patricia, petId: petIds.mia,   planId: planIds.higiene, status: "ativa",       dataInicio: "2026-03-15", dataVencimento: "2026-07-15", usosNoMes: 2 },
    { id: assIds.a4, tenantId: tid, tutorId: tutIds.thiago,   petId: petIds.leo,   planId: planIds.saude,   status: "ativa",       dataInicio: "2026-04-01", dataVencimento: "2026-07-01", usosNoMes: 0 },
    { id: assIds.a5, tenantId: tid, tutorId: tutIds.rodrigo,  petId: petIds.luna,  planId: planIds.premium, status: "inadimplente", dataInicio: "2026-01-20", dataVencimento: "2026-06-20", usosNoMes: 0 },
    { id: assIds.a6, tenantId: tid, tutorId: tutIds.joao,     petId: petIds.duke,  planId: planIds.higiene, status: "cancelada",   dataInicio: "2025-12-01", dataVencimento: "2026-05-01", usosNoMes: 0 },
  ]);

  /* ── agendamentos ──────────────────────────────────────────────────── */
  console.log("📅  Criando agendamentos...");

  await db.insert(appointments).values([
    // passados - concluídos (maio/junho)
    { id: uid(), tenantId: tid, tutorId: tutIds.mariana,  petId: petIds.thor,  professionalId: proIds.lucas,   serviceId: svcIds.banhoGrd, data: "2026-05-03", horaInicio: "09:00", horaFim: "10:30", status: "concluido", preco: "90.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.mariana,  petId: petIds.mel,   professionalId: proIds.beatriz, serviceId: svcIds.banhoPeq, data: "2026-05-06", horaInicio: "10:00", horaFim: "11:00", status: "concluido", preco: "45.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.rodrigo,  petId: petIds.luna,  professionalId: proIds.beatriz, serviceId: svcIds.tosaComp, data: "2026-05-08", horaInicio: "14:00", horaFim: "15:30", status: "concluido", preco: "80.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.camila,   petId: petIds.bob,   professionalId: proIds.carlos,  serviceId: svcIds.consulta, data: "2026-05-10", horaInicio: "09:00", horaFim: "09:45", status: "concluido", preco: "150.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.felipe,   petId: petIds.nina,  professionalId: proIds.carlos,  serviceId: svcIds.vacina,   data: "2026-05-12", horaInicio: "11:00", horaFim: "11:30", status: "concluido", preco: "80.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.patricia, petId: petIds.rex,   professionalId: proIds.carlos,  serviceId: svcIds.consulta, data: "2026-05-15", horaInicio: "15:00", horaFim: "15:45", status: "concluido", preco: "150.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.patricia, petId: petIds.mia,   professionalId: proIds.beatriz, serviceId: svcIds.tosaComp, data: "2026-05-17", horaInicio: "09:00", horaFim: "10:30", status: "concluido", preco: "80.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.joao,     petId: petIds.duke,  professionalId: proIds.lucas,   serviceId: svcIds.banhoGrd, data: "2026-05-20", horaInicio: "10:00", horaFim: "11:30", status: "concluido", preco: "90.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.amanda,   petId: petIds.bella, professionalId: proIds.carlos,  serviceId: svcIds.consulta, data: "2026-05-22", horaInicio: "14:00", horaFim: "14:45", status: "concluido", preco: "150.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.thiago,   petId: petIds.leo,   professionalId: proIds.beatriz, serviceId: svcIds.tosaComp, data: "2026-05-24", horaInicio: "09:00", horaFim: "10:30", status: "concluido", preco: "80.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.renata,   petId: petIds.pingo, professionalId: proIds.lucas,   serviceId: svcIds.banhoPeq, data: "2026-05-27", horaInicio: "11:00", horaFim: "12:00", status: "concluido", preco: "45.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.gustavo,  petId: petIds.nala,  professionalId: proIds.beatriz, serviceId: svcIds.banhoPeq, data: "2026-05-29", horaInicio: "15:00", horaFim: "16:00", status: "concluido", preco: "45.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.mariana,  petId: petIds.thor,  professionalId: proIds.lucas,   serviceId: svcIds.banhoGrd, data: "2026-06-03", horaInicio: "09:00", horaFim: "10:30", status: "concluido", preco: "90.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.rodrigo,  petId: petIds.amora, professionalId: proIds.beatriz, serviceId: svcIds.tosaComp, data: "2026-06-05", horaInicio: "10:00", horaFim: "11:30", status: "concluido", preco: "80.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.camila,   petId: petIds.bob,   professionalId: proIds.lucas,   serviceId: svcIds.banhoPeq, data: "2026-06-10", horaInicio: "14:00", horaFim: "15:00", status: "concluido", preco: "45.00" },
    // passados - faltou / cancelado
    { id: uid(), tenantId: tid, tutorId: tutIds.joao,     petId: petIds.duke,  professionalId: proIds.carlos,  serviceId: svcIds.consulta, data: "2026-06-07", horaInicio: "16:00", horaFim: "16:45", status: "faltou",   preco: "150.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.gustavo,  petId: petIds.kiko,  professionalId: proIds.carlos,  serviceId: svcIds.consulta, data: "2026-06-12", horaInicio: "09:00", horaFim: "09:45", status: "cancelado", preco: "150.00" },
    // futuros - agendados e confirmados
    { id: uid(), tenantId: tid, tutorId: tutIds.mariana,  petId: petIds.thor,  professionalId: proIds.carlos,  serviceId: svcIds.consulta, data: "2026-06-16", horaInicio: "10:00", horaFim: "10:45", status: "confirmado", preco: "150.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.patricia, petId: petIds.mia,   professionalId: proIds.beatriz, serviceId: svcIds.tosaComp, data: "2026-06-17", horaInicio: "09:00", horaFim: "10:30", status: "agendado",  preco: "80.00"  },
    { id: uid(), tenantId: tid, tutorId: tutIds.thiago,   petId: petIds.leo,   professionalId: proIds.lucas,   serviceId: svcIds.banhoPeq, data: "2026-06-17", horaInicio: "14:00", horaFim: "15:00", status: "agendado",  preco: "45.00"  },
    { id: uid(), tenantId: tid, tutorId: tutIds.rodrigo,  petId: petIds.luna,  professionalId: proIds.beatriz, serviceId: svcIds.tosaComp, data: "2026-06-18", horaInicio: "09:00", horaFim: "10:30", status: "agendado",  preco: "80.00"  },
    { id: uid(), tenantId: tid, tutorId: tutIds.camila,   petId: petIds.bob,   professionalId: proIds.carlos,  serviceId: svcIds.vacina,   data: "2026-06-19", horaInicio: "11:00", horaFim: "11:30", status: "agendado",  preco: "80.00"  },
    { id: uid(), tenantId: tid, tutorId: tutIds.amanda,   petId: petIds.bella, professionalId: proIds.lucas,   serviceId: svcIds.banhoPeq, data: "2026-06-20", horaInicio: "15:00", horaFim: "16:00", status: "confirmado", preco: "45.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.renata,   petId: petIds.pingo, professionalId: proIds.beatriz, serviceId: svcIds.tosaComp, data: "2026-06-21", horaInicio: "10:00", horaFim: "11:30", status: "agendado",  preco: "80.00"  },
    { id: uid(), tenantId: tid, tutorId: tutIds.joao,     petId: petIds.duke,  professionalId: proIds.carlos,  serviceId: svcIds.consulta, data: "2026-06-23", horaInicio: "09:00", horaFim: "09:45", status: "agendado",  preco: "150.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.gustavo,  petId: petIds.nala,  professionalId: proIds.carlos,  serviceId: svcIds.consulta, data: "2026-06-24", horaInicio: "14:00", horaFim: "14:45", status: "agendado",  preco: "150.00" },
    { id: uid(), tenantId: tid, tutorId: tutIds.mariana,  petId: petIds.mel,   professionalId: proIds.beatriz, serviceId: svcIds.banhoPeq, data: "2026-06-25", horaInicio: "10:00", horaFim: "11:00", status: "agendado",  preco: "45.00"  },
    { id: uid(), tenantId: tid, tutorId: tutIds.patricia, petId: petIds.rex,   professionalId: proIds.carlos,  serviceId: svcIds.vacina,   data: "2026-06-28", horaInicio: "09:00", horaFim: "09:30", status: "agendado",  preco: "80.00"  },
    // julho
    { id: uid(), tenantId: tid, tutorId: tutIds.mariana,  petId: petIds.thor,  professionalId: proIds.lucas,   serviceId: svcIds.banhoGrd, data: "2026-07-03", horaInicio: "09:00", horaFim: "10:30", status: "agendado",  preco: "90.00"  },
    { id: uid(), tenantId: tid, tutorId: tutIds.rodrigo,  petId: petIds.amora, professionalId: proIds.beatriz, serviceId: svcIds.tosaComp, data: "2026-07-05", horaInicio: "14:00", horaFim: "15:30", status: "agendado",  preco: "80.00"  },
  ]);

  /* ── vacinas ───────────────────────────────────────────────────────── */
  console.log("💉  Criando vacinas...");

  await db.insert(vacinas).values([
    { id: uid(), tenantId: tid, petId: petIds.thor,  profissionalId: proIds.carlos, tipo: "V10 (Polivalente)",      fabricante: "Zoetis",  lote: "ZOE2024-001", dataAplicacao: "2025-04-10", proximaDose: "2026-04-10" },
    { id: uid(), tenantId: tid, petId: petIds.thor,  profissionalId: proIds.carlos, tipo: "Antirrábica",            fabricante: "Merial",  lote: "MER2025-012", dataAplicacao: "2025-06-15", proximaDose: "2026-06-15" },
    { id: uid(), tenantId: tid, petId: petIds.mel,   profissionalId: proIds.carlos, tipo: "Tríplice Felina (V3)",   fabricante: "Pfizer",  lote: "PFZ2025-034", dataAplicacao: "2025-07-22", proximaDose: "2026-07-22" },
    { id: uid(), tenantId: tid, petId: petIds.luna,  profissionalId: proIds.carlos, tipo: "V8 (Polivalente)",       fabricante: "MSD",     lote: "MSD2025-067", dataAplicacao: "2026-01-20", proximaDose: "2027-01-20" },
    { id: uid(), tenantId: tid, petId: petIds.luna,  profissionalId: proIds.carlos, tipo: "Antirrábica",            fabricante: "Merial",  lote: "MER2026-005", dataAplicacao: "2026-03-10", proximaDose: "2027-03-10" },
    { id: uid(), tenantId: tid, petId: petIds.nina,  profissionalId: proIds.carlos, tipo: "Tríplice Felina (V3)",   fabricante: "Pfizer",  lote: "PFZ2026-011", dataAplicacao: "2026-05-12", proximaDose: "2027-05-12" },
    { id: uid(), tenantId: tid, petId: petIds.rex,   profissionalId: proIds.carlos, tipo: "V10 (Polivalente)",      fabricante: "Zoetis",  lote: "ZOE2025-099", dataAplicacao: "2025-09-05", proximaDose: "2026-09-05" },
    { id: uid(), tenantId: tid, petId: petIds.rex,   profissionalId: proIds.carlos, tipo: "Gripe Canina",           fabricante: "Boehringer", lote: "BOE2026-003", dataAplicacao: "2026-02-18", proximaDose: "2026-08-18" },
    { id: uid(), tenantId: tid, petId: petIds.duke,  profissionalId: proIds.carlos, tipo: "V8 (Polivalente)",       fabricante: "MSD",     lote: "MSD2026-021", dataAplicacao: "2026-04-01", proximaDose: "2027-04-01" },
    { id: uid(), tenantId: tid, petId: petIds.nala,  profissionalId: proIds.carlos, tipo: "Leucemia Felina (FeLV)", fabricante: "Pfizer",  lote: "PFZ2026-045", dataAplicacao: "2026-05-30", proximaDose: "2027-05-30" },
    { id: uid(), tenantId: tid, petId: petIds.bella, profissionalId: proIds.carlos, tipo: "Antirrábica",            fabricante: "Merial",  lote: "MER2026-009", dataAplicacao: "2026-06-05", proximaDose: "2027-06-05" },
  ]);

  /* ── prontuários ───────────────────────────────────────────────────── */
  console.log("📋  Criando prontuários...");

  await db.insert(prontuarios).values([
    {
      id: uid(), tenantId: tid, petId: petIds.bob, profissionalId: proIds.carlos,
      dataConsulta: "2026-05-10", queixa: "Coceira intensa nas patas e barriga",
      diagnostico: "Dermatite alérgica. Suspeita de alergia alimentar.",
      prescricao: "Apoquil 5,4mg 1x ao dia por 14 dias. Banho com shampoo hipoalergênico.",
      peso: "10.5", temperatura: "38.5",
      observacoes: "Recomendado teste de dieta de eliminação.",
      retorno: "2026-06-10",
    },
    {
      id: uid(), tenantId: tid, petId: petIds.bella, profissionalId: proIds.carlos,
      dataConsulta: "2026-05-22", queixa: "Tutor relata inapetência há 3 dias e vômito ocasional",
      diagnostico: "Gastroenterite leve. Sem sinais de obstrução.",
      prescricao: "Omeprazol 10mg 1x ao dia. Metoclopramida. Dieta leve por 5 dias.",
      peso: "3.5", temperatura: "38.9",
      observacoes: "Orientado sobre dieta sem frango conforme histórico de alergias.",
      retorno: "2026-05-29",
    },
    {
      id: uid(), tenantId: tid, petId: petIds.rex, profissionalId: proIds.carlos,
      dataConsulta: "2026-05-15", queixa: "Manquejando do membro posterior direito após pular",
      diagnostico: "Distensão muscular grau 1. Sem fratura.",
      prescricao: "Carprofeno 100mg 1x ao dia por 5 dias. Repouso por 10 dias.",
      peso: "32.0", temperatura: "38.3",
      observacoes: "Raio-X normal. Reavaliação em 10 dias se não melhorar.",
      retorno: "2026-05-25",
    },
    {
      id: uid(), tenantId: tid, petId: petIds.thor, profissionalId: proIds.carlos,
      dataConsulta: "2026-06-03", queixa: "Check-up anual",
      diagnostico: "Animal saudável. Sobrepeso leve.",
      prescricao: "Controle alimentar. Redução de 15% na ração. Exercícios diários.",
      peso: "28.5", temperatura: "38.4",
      observacoes: "Vacinas em dia. Vermifugação realizada.",
      retorno: "2026-12-03",
    },
    {
      id: uid(), tenantId: tid, petId: petIds.nala, profissionalId: proIds.carlos,
      dataConsulta: "2026-06-10", queixa: "Rotina — check-up e renovação de vacinas",
      diagnostico: "Saúde ótima. Peso ideal para a raça.",
      prescricao: "Manutenção. Vacinas atualizadas na visita.",
      peso: "6.0", temperatura: "38.6",
      retorno: "2026-12-10",
    },
  ]);

  /* ── transações ────────────────────────────────────────────────────── */
  console.log("💰  Criando transações...");

  await db.insert(transacoes).values([
    // ABRIL — receitas
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "servicos",   descricao: "Banhos e tosas — semana 1",        valor: "355.00", status: "pago", data: "2026-04-05", pago: true },
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "servicos",   descricao: "Banhos e tosas — semana 2",        valor: "440.00", status: "pago", data: "2026-04-12", pago: true },
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "consultas",  descricao: "Consultas veterinárias — abril",   valor: "600.00", status: "pago", data: "2026-04-30", pago: true },
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "planos",     descricao: "Mensalidades de planos — abril",   valor: "940.00", status: "pago", data: "2026-04-01", pago: true },
    // ABRIL — despesas
    { id: uid(), tenantId: tid, tipo: "despesa", categoria: "insumos",    descricao: "Shampoos e condicionadores",        valor: "280.00", status: "pago", data: "2026-04-08", pago: true },
    { id: uid(), tenantId: tid, tipo: "despesa", categoria: "aluguel",    descricao: "Aluguel do espaço — abril",         valor: "2500.00", status: "pago", data: "2026-04-10", pago: true },
    { id: uid(), tenantId: tid, tipo: "despesa", categoria: "folha",      descricao: "Salários equipe — abril",           valor: "4800.00", status: "pago", data: "2026-04-30", pago: true },
    // MAIO — receitas
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "servicos",   descricao: "Banhos e tosas — semana 1",        valor: "405.00", status: "pago", data: "2026-05-03", pago: true },
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "servicos",   descricao: "Banhos e tosas — semana 2",        valor: "525.00", status: "pago", data: "2026-05-10", pago: true },
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "servicos",   descricao: "Banhos e tosas — semana 3",        valor: "460.00", status: "pago", data: "2026-05-17", pago: true },
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "servicos",   descricao: "Banhos e tosas — semana 4",        valor: "385.00", status: "pago", data: "2026-05-24", pago: true },
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "consultas",  descricao: "Consultas veterinárias — maio",    valor: "750.00", status: "pago", data: "2026-05-31", pago: true },
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "planos",     descricao: "Mensalidades de planos — maio",    valor: "940.00", status: "pago", data: "2026-05-01", pago: true },
    // MAIO — despesas
    { id: uid(), tenantId: tid, tipo: "despesa", categoria: "insumos",    descricao: "Vacinas e medicamentos",            valor: "420.00", status: "pago", data: "2026-05-05", pago: true },
    { id: uid(), tenantId: tid, tipo: "despesa", categoria: "aluguel",    descricao: "Aluguel do espaço — maio",          valor: "2500.00", status: "pago", data: "2026-05-10", pago: true },
    { id: uid(), tenantId: tid, tipo: "despesa", categoria: "folha",      descricao: "Salários equipe — maio",            valor: "4800.00", status: "pago", data: "2026-05-31", pago: true },
    { id: uid(), tenantId: tid, tipo: "despesa", categoria: "manutencao", descricao: "Manutenção equipamento de banho",   valor: "350.00", status: "pago", data: "2026-05-20", pago: true },
    // JUNHO — receitas (até hoje 14/06)
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "servicos",   descricao: "Banhos e tosas — semana 1",        valor: "390.00", status: "pago", data: "2026-06-05", pago: true },
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "servicos",   descricao: "Banhos e tosas — semana 2",        valor: "275.00", status: "pago", data: "2026-06-12", pago: true },
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "planos",     descricao: "Mensalidades de planos — junho",   valor: "940.00", status: "pago", data: "2026-06-01", pago: true },
    // JUNHO — despesas
    { id: uid(), tenantId: tid, tipo: "despesa", categoria: "aluguel",    descricao: "Aluguel do espaço — junho",         valor: "2500.00", status: "pago", data: "2026-06-10", pago: true },
    { id: uid(), tenantId: tid, tipo: "despesa", categoria: "insumos",    descricao: "Insumos gerais — junho",            valor: "180.00", status: "pago", data: "2026-06-08", pago: true },
    // pendentes futuras
    { id: uid(), tenantId: tid, tipo: "despesa", categoria: "folha",      descricao: "Salários equipe — junho",           valor: "4800.00", status: "pendente", data: "2026-06-30", dataVencimento: "2026-06-30", pago: false },
    { id: uid(), tenantId: tid, tipo: "receita", categoria: "consultas",  descricao: "Consultas veterinárias — junho",   valor: "600.00", status: "pendente", data: "2026-06-30", dataVencimento: "2026-06-30", pago: false },
  ]);

  console.log("\n🎉  Seed concluído com sucesso!\n");
  console.log("   Profissionais : 4");
  console.log("   Serviços      : 7");
  console.log("   Planos        : 3");
  console.log("   Tutores       : 10");
  console.log("   Pets          : 15");
  console.log("   Assinaturas   : 6");
  console.log("   Agendamentos  : 30");
  console.log("   Vacinas       : 11");
  console.log("   Prontuários   : 5");
  console.log("   Transações    : 24\n");
}

main().catch((err) => {
  console.error("❌  Erro no seed:", err);
  process.exit(1);
});
