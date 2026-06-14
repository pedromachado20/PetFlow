import { pgTable, text, timestamp, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { tutores } from "./tutores";
import { pets } from "./pets";
import { professionals } from "./professionals";
import { services } from "./services";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "agendado",
  "confirmado",
  "em_atendimento",
  "concluido",
  "cancelado",
  "faltou",
]);

export const appointments = pgTable("appointments", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  tutorId: text("tutor_id").notNull().references(() => tutores.id, { onDelete: "cascade" }),
  petId: text("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  professionalId: text("professional_id").notNull().references(() => professionals.id, { onDelete: "cascade" }),
  serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  data: text("data").notNull(),
  horaInicio: text("hora_inicio").notNull(),
  horaFim: text("hora_fim").notNull(),
  status: appointmentStatusEnum("status").notNull().default("agendado"),
  preco: numeric("preco", { precision: 10, scale: 2 }).notNull().default("0"),
  observacoes: text("observacoes"),
  notificacaoEnviada: boolean("notificacao_enviada").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
