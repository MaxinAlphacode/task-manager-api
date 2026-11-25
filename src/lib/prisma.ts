import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';

// Prisma 7 habla con PostgreSQL a través de un "adaptador" (el driver oficial `pg`).
// Una sola conexión (pool) para toda la app.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
