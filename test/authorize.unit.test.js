// Tests unitarios del middleware de autorización (sin base de datos ni HTTP).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PERMISSIONS } from '../src/constants/permissions.js';
import { authorize } from '../src/middlewares/authorize.middleware.js';

const run = (middleware, req) => {
  let received;
  middleware(req, {}, (err) => {
    received = err;
  });
  return received;
};

describe('authorize()', () => {
  it('deja pasar un rol permitido', () => {
    const err = run(authorize(PERMISSIONS.EVENTS_CREATE), { user: { role: 'organizer' } });
    assert.equal(err, undefined);
  });

  it('responde 403 si el rol no está permitido', () => {
    const err = run(authorize(PERMISSIONS.EVENTS_CREATE), { user: { role: 'user' } });
    assert.equal(err.statusCode, 403);
  });

  it('responde 401 si no hay req.user (falta authenticate)', () => {
    const err = run(authorize(PERMISSIONS.EVENTS_CREATE), {});
    assert.equal(err.statusCode, 401);
  });

  it('acepta roles sueltos o arrays', () => {
    assert.equal(run(authorize('admin', 'organizer'), { user: { role: 'admin' } }), undefined);
    assert.equal(run(authorize(['admin']), { user: { role: 'admin' } }), undefined);
  });

  it('falla al configurar la ruta sin roles o con roles desconocidos', () => {
    assert.throws(() => authorize(), /al menos un rol/);
    assert.throws(() => authorize('superadmin'), /roles desconocidos/);
  });
});
