import { pgTable, text, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { pets } from "./pets";
import { professionals } from "./professionals";

export const vacinas = pgTable("vacinas", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  petId: text("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  profissionalId: text("profissional_id").references(() => professionals.id, { onDelete: "set null" }),
  tipo: text("tipo").notNull(),
  fabricante: text("fabricante"),
  lote: text("lote"),
  dataAplicacao: text("data_aplicacao").notNull(),
  proximaDose: text("proxima_dose"),
  notificacaoEnviada: boolean("notificacao_enviada").notNull().default(false),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prontuarios = pgTable("prontuarios", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  petId: text("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  profissionalId: text("profissional_id").references(() => professionals.id, { onDelete: "set null" }),
  dataConsulta: text("data_consulta").notNull(),
  queixa: text("queixa"),
  diagnostico: text("diagnostico"),
  prescricao: text("prescricao"),
  peso: numeric("peso", { precision: 5, scale: 2 }),
  temperatura: numeric("temperatura", { precision: 4, scale: 1 }),
  observacoes: text("observacoes"),
  retorno: text("retorno"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Vacina = typeof vacinas.$inferSelect;
export type NewVacina = typeof vacinas.$inferInsert;
export type Prontuario = typeof prontuarios.$inferSelect;
export type NewProntuario = typeof prontuarios.$inferInsert;
