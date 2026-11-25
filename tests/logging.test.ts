import { Writable } from 'node:stream';
import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { loggerOptions } from '../src/lib/logger';

const app = createApp();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('Request ID (trazabilidad)', () => {
  it('genera un X-Request-Id para cada respuesta', async () => {
    const a = await request(app).get('/api/health');
    const b = await request(app).get('/api/health');

    expect(a.headers['x-request-id']).toMatch(UUID);
    expect(a.headers['x-request-id']).not.toBe(b.headers['x-request-id']);
  });

  it('respeta un X-Request-Id válido que venga de afuera', async () => {
    const res = await request(app).get('/api/health').set('X-Request-Id', 'frontend-abc-123');
    expect(res.headers['x-request-id']).toBe('frontend-abc-123');
  });

  it('reemplaza un X-Request-Id peligroso (inyección en logs)', async () => {
    const res = await request(app).get('/api/health').set('X-Request-Id', 'x"}, {"admin":true');
    expect(res.headers['x-request-id']).toMatch(UUID);
  });
});

describe('Logs sin secretos', () => {
  it('oculta tokens, contraseñas y la cabecera Authorization', () => {
    const lines: string[] = [];
    const memory = new Writable({
      write(chunk, _enc, done) {
        lines.push(chunk.toString());
        done();
      },
    });
    const log = pino({ ...loggerOptions, level: 'info' }, memory);

    log.info(
      {
        req: { headers: { authorization: 'Bearer eyJ-secreto' } },
        body: { email: 'a@b.com', password: 'mi-clave' },
        data: { token: 'eyJ-otro-secreto' },
      },
      'prueba',
    );

    const output = lines.join('');
    expect(output).not.toContain('eyJ-secreto');
    expect(output).not.toContain('mi-clave');
    expect(output).not.toContain('eyJ-otro-secreto');
    expect(output).toContain('[OCULTO]');
    expect(output).toContain('a@b.com'); // lo que no es secreto sí queda
  });
});
