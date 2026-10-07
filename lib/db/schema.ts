import { pgTable, serial, smallint, text, timestamp } from 'drizzle-orm/pg-core'

export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  day: smallint('day').notNull(),
  endDay: smallint('end_day'),
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  title: text('title').notNull(),
  location: text('location'),
  description: text('description'),
  category: text('category').notNull().default('programm'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const planSettings = pgTable('plan_settings', {
  id: smallint('id').primaryKey().default(1),
  editKey: text('edit_key').notNull(),
  title: text('title').notNull().default('Wochenplan'),
})

export type Activity = typeof activities.$inferSelect
