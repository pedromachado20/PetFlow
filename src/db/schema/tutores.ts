import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const tutores = pgTable("tutores", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  email: text("email"),
  telefone: text("telefone"),
  cpf: text("cpf"),
  endereco: text("endereco"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  estado: text("estado"),
  cep: text("cep"),
  fotoUrl: text("foto_url"),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Tutor = typeof tutores.$inferSelect;
export type NewTutor = typeof tutores.$inferInsert;
