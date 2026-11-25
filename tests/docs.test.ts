import request from 'supertest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { openApiDocument } from '../src/docs/openapi';

const app = createApp();
const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

describe('Documentación OpenAPI', () => {
  it('es un documento OpenAPI 3.1 válido', async () => {
    // structuredClone: el validador modifica el objeto que recibe.
    await expect(SwaggerParser.validate(structuredClone(openApiDocument) as never)).resolves.toBeDefined();
  });

  it('se sirve en /api/docs.json y /api/docs', async () => {
    const jsonRes = await request(app).get('/api/docs.json');
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.body.openapi).toBe('3.1.0');

    const uiRes = await request(app).get('/api/docs/');
    expect(uiRes.status).toBe(200);
    expect(uiRes.text).toContain('swagger-ui');
  });

  it('cada ruta documentada existe de verdad en la API', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000';

    for (const [path, item] of Object.entries(openApiDocument.paths)) {
      for (const method of METHODS) {
        if (!(method in item)) continue;

        const url = path.replace('{id}', fakeId);
        const res = await request(app)[method](url).send({});

        // Nuestro notFoundHandler responde "Ruta X no existe". Cualquier otra
        // respuesta (200, 400, 401, 404 de "tarea no encontrada"...) significa que la ruta existe.
        expect(res.body?.error?.message ?? '', `${method.toUpperCase()} ${path}`).not.toMatch(/^Ruta /);
      }
    }
  });
});
