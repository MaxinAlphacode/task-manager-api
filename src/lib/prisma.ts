import { PrismaClient } from '@prisma/client';

// Una sola conexión a la base de datos para toda la app.
export const prisma = new PrismaClient();
