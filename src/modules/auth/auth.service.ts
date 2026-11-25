import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/app-error';
import { signToken } from './token';
import type { LoginInput, RegisterInput } from './auth.schema';

// Cuántas "vueltas" da bcrypt al licuar la contraseña. Más = más lento para un ladrón.
const SALT_ROUNDS = 10;

// Huella falsa para comparar cuando el email no existe. Así el login tarda lo mismo
// exista o no el usuario, y nadie puede adivinar qué emails están registrados midiendo el tiempo.
const DUMMY_HASH = bcrypt.hashSync('contraseña-de-relleno', SALT_ROUNDS);

// Nunca devolvemos la huella de la contraseña hacia afuera.
const toPublicUser = ({ passwordHash: _omit, ...user }: User) => user;

export const authService = {
  async register(input: RegisterInput) {
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw AppError.conflict('Ese email ya está registrado');

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, SALT_ROUNDS),
      },
    });

    return { user: toPublicUser(user), token: signToken(user.id) };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);

    // Mismo mensaje si falla el email o la contraseña: no damos pistas.
    if (!user || !valid) throw AppError.unauthorized('Email o contraseña incorrectos');

    return { user: toPublicUser(user), token: signToken(user.id) };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.unauthorized('El usuario ya no existe');
    return toPublicUser(user);
  },
};
