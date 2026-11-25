import { z } from 'zod';
import { loginSchema, registerSchema } from '../modules/auth/auth.schema';
import {
  TASK_PRIORITY,
  TASK_STATUS,
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from '../modules/tasks/task.schema';

// ─────────────────────────────────────────────────────────────────────────────
// El "manual de instrucciones" de la API en formato OpenAPI 3.1.
//
// Truco importante: las reglas de entrada NO se escriben dos veces.
// Las sacamos de los mismos esquemas de Zod que validan las peticiones.
// Si cambias una regla en Zod, la documentación cambia sola.
// ─────────────────────────────────────────────────────────────────────────────

type JsonSchema = Record<string, unknown>;

/** Convierte un esquema de Zod a JSON Schema (el idioma de OpenAPI). */
function toSchema(schema: z.ZodType, io: 'input' | 'output' = 'input'): JsonSchema {
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema, {
    io,
    unrepresentable: 'any',
    // Si ya dice "format: email" o "date-time", el regex gigante solo estorba al lector.
    override: (ctx) => {
      if (ctx.jsonSchema.format) delete ctx.jsonSchema.pattern;
    },
  });
  return json;
}

/** Convierte cada campo de un esquema de query de Zod en un parámetro de OpenAPI. */
function toQueryParams(schema: z.ZodObject) {
  const json = toSchema(schema) as { properties: Record<string, JsonSchema> };
  return Object.entries(json.properties).map(([name, propSchema]) => ({
    name,
    in: 'query',
    required: false,
    schema: propSchema,
  }));
}

// ── Esquemas de RESPUESTA (solo para documentar lo que devolvemos) ───────────

const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const taskSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(TASK_STATUS),
  priority: z.enum(TASK_PRIORITY),
  dueDate: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  userId: z.uuid(),
});

const errorSchema = z.object({
  error: z.object({
    message: z.string(),
    details: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
  }),
});

// ── Atajos para no repetir ───────────────────────────────────────────────────

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: JsonSchema, example?: unknown) => ({
  content: { 'application/json': { schema, ...(example !== undefined && { example }) } },
});
const secured = [{ bearerAuth: [] }];
const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'ID (UUID) de la tarea',
  schema: { type: 'string', format: 'uuid' },
};
const err = (name: string) => ({ $ref: `#/components/responses/${name}` });

const taskExample = {
  title: 'Preparar entrevista técnica',
  description: 'Repasar JWT, índices y paginación',
  priority: 'HIGH',
  dueDate: '2026-12-01T10:00:00Z',
};

// ── El documento ─────────────────────────────────────────────────────────────

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Task Manager API',
    version: '1.0.0',
    description:
      'API REST de gestión de tareas con autenticación JWT.\n\n' +
      '**Cómo probarla:** 1) `POST /api/auth/register` o `/login`, 2) copia el `token`, ' +
      '3) pulsa **Authorize** arriba a la derecha y pégalo, 4) ya puedes usar las rutas 🔒.',
  },
  servers: [{ url: '/', description: 'Este servidor' }],
  tags: [
    { name: 'Health', description: 'Estado del servicio' },
    { name: 'Auth', description: 'Registro, login y usuario actual' },
    { name: 'Tasks', description: 'Tareas del usuario autenticado' },
  ],

  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Comprobar que la API y la base de datos están vivas',
        responses: {
          200: {
            description: 'Todo bien',
            ...json(ref('Health'), { status: 'ok', database: 'up', timestamp: '2026-11-25T21:00:00.000Z' }),
          },
          503: {
            description: 'La base de datos no responde',
            ...json(ref('Health'), { status: 'error', database: 'down', timestamp: '2026-11-25T21:00:00.000Z' }),
          },
        },
      },
    },

    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Crear una cuenta',
        requestBody: {
          required: true,
          ...json(ref('RegisterInput'), {
            name: 'Cristian García',
            email: 'cristian@example.com',
            password: 'contraseña-segura',
          }),
        },
        responses: {
          201: { description: 'Cuenta creada', ...json(ref('AuthResponse')) },
          400: err('ValidationError'),
          409: { description: 'El email ya está registrado', ...json(ref('Error')) },
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          ...json(ref('LoginInput'), { email: 'cristian@example.com', password: 'contraseña-segura' }),
        },
        responses: {
          200: { description: 'Login correcto', ...json(ref('AuthResponse')) },
          400: err('ValidationError'),
          401: { description: 'Email o contraseña incorrectos', ...json(ref('Error')) },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Ver el usuario del token',
        security: secured,
        responses: {
          200: { description: 'Usuario actual', ...json({ type: 'object', properties: { data: ref('User') } }) },
          401: err('Unauthorized'),
        },
      },
    },

    '/api/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Listar mis tareas',
        description: 'Con filtros, búsqueda por texto, ordenamiento y paginación.',
        security: secured,
        parameters: toQueryParams(listTasksQuerySchema),
        responses: {
          200: { description: 'Página de tareas', ...json(ref('TaskList')) },
          400: err('ValidationError'),
          401: err('Unauthorized'),
        },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Crear una tarea',
        security: secured,
        requestBody: { required: true, ...json(ref('CreateTaskInput'), taskExample) },
        responses: {
          201: {
            description: 'Tarea creada',
            headers: { Location: { description: 'URL de la nueva tarea', schema: { type: 'string' } } },
            ...json(ref('TaskResponse')),
          },
          400: err('ValidationError'),
          401: err('Unauthorized'),
        },
      },
    },

    '/api/tasks/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Tasks'],
        summary: 'Ver una tarea',
        security: secured,
        responses: {
          200: { description: 'La tarea', ...json(ref('TaskResponse')) },
          400: err('ValidationError'),
          401: err('Unauthorized'),
          404: err('NotFound'),
        },
      },
      patch: {
        tags: ['Tasks'],
        summary: 'Actualizar una tarea',
        description: 'Solo se cambian los campos enviados. Envía `null` para borrar `description` o `dueDate`.',
        security: secured,
        requestBody: { required: true, ...json(ref('UpdateTaskInput'), { status: 'DONE' }) },
        responses: {
          200: { description: 'Tarea actualizada', ...json(ref('TaskResponse')) },
          400: err('ValidationError'),
          401: err('Unauthorized'),
          404: err('NotFound'),
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Eliminar una tarea',
        security: secured,
        responses: {
          204: { description: 'Eliminada (sin contenido)' },
          400: err('ValidationError'),
          401: err('Unauthorized'),
          404: err('NotFound'),
        },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'error'] },
          database: { type: 'string', enum: ['up', 'down'] },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      RegisterInput: toSchema(registerSchema),
      LoginInput: toSchema(loginSchema),
      CreateTaskInput: toSchema(createTaskSchema),
      UpdateTaskInput: toSchema(updateTaskSchema),
      User: toSchema(userSchema, 'output'),
      Task: toSchema(taskSchema, 'output'),
      AuthResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: { user: ref('User'), token: { type: 'string', description: 'JWT para la cabecera Authorization' } },
          },
        },
      },
      TaskResponse: { type: 'object', properties: { data: ref('Task') } },
      TaskList: {
        type: 'object',
        properties: {
          data: { type: 'array', items: ref('Task') },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
      },
      Error: toSchema(errorSchema, 'output'),
    },
    responses: {
      ValidationError: {
        description: 'Datos inválidos',
        ...json(ref('Error'), {
          error: { message: 'Datos inválidos', details: [{ field: 'title', message: 'El título es obligatorio' }] },
        }),
      },
      Unauthorized: {
        description: 'Falta el token o es inválido/vencido',
        ...json(ref('Error'), { error: { message: 'Token inválido o vencido' } }),
      },
      NotFound: {
        description: 'No existe (o no es tuya)',
        ...json(ref('Error'), { error: { message: 'Tarea no encontrada' } }),
      },
    },
  },
};
