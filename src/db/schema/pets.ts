import { pgTable, text, timestamp, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { tutores } from "./tutores";

export const especieEnum = pgEnum("especie", ["cachorro", "gato", "passaro", "peixe", "hamster", "coelho", "reptil", "outro"]);
export const sexoPetEnum = pgEnum("sexo_pet", ["macho", "femea", "nao_informado"]);
export const portePetEnum = pgEnum("porte_pet", ["mini", "pequeno", "medio", "grande", "gigante"]);

export const pets = pgTable("pets", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  tutorId: text("tutor_id").notNull().references(() => tutores.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  especie: especieEnum("especie").notNull().default("cachorro"),
  raca: text("raca"),
  sexo: sexoPetEnum("sexo").notNull().default("nao_informado"),
  porte: portePetEnum("porte").notNull().default("medio"),
  dataNascimento: text("data_nascimento"),
  peso: numeric("peso", { precision: 5, scale: 2 }),
  cor: text("cor"),
  microchip: text("microchip"),
  castrado: boolean("castrado").notNull().default(false),
  fotoUrl: text("foto_url"),
  observacoes: text("observacoes"),
  alergias: text("alergias"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Pet = typeof pets.$inferSelect;
export type NewPet = typeof pets.$inferInsert;
