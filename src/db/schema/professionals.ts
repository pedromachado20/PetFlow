import { pgTable, text, timestamp, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const especialidadeEnum = pgEnum("especialidade", ["veterinario", "tosador", "banhista", "auxiliar", "recepcao"]);

export const professionals = pgTable("professionals", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  especialidade: especialidadeEnum("especialidade").notNull().default("auxiliar"),
  telefone: text("telefone"),
  email: text("email"),
  crmv: text("crmv"),
  comissao: numeric("comissao", { precision: 5, scale: 2 }).default("0"),
  fotoUrl: text("foto_url"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workingHours = pgTable("working_hours", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  professionalId: text("professional_id").notNull().references(() => professionals.id, { onDelete: "cascade" }),
  diaSemana: text("dia_semana").notNull(),
  horaInicio: text("hora_inicio").notNull(),
  horaFim: text("hora_fim").notNull(),
  ativo: boolean("ativo").notNull().default(true),
});

export type Professional = typeof professionals.$inferSelect;
export type NewProfessional = typeof professionals.$inferInsert;
