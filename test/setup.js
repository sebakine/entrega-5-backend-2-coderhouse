// Entorno de pruebas aislado: Mongo en memoria (o TEST_MONGO_URL si se define)
// y variables de entorno propias, sin depender del .env local.
import mongoose from 'mongoose';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-de-al-menos-32-caracteres!!';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.LOGIN_RATE_LIMIT = '1000';

let memoryServer;
if (process.env.TEST_MONGO_URL) {
  process.env.MONGO_URL = process.env.TEST_MONGO_URL;
} else {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  process.env.MONGO_URL = memoryServer.getUri('eventos_test');
}

const { createApp } = await import('../src/app.js');
const { connectDB, disconnectDB } = await import('../src/config/db.js');
const { UserModel } = await import('../src/models/user.model.js');
const { hashPassword } = await import('../src/utils/password.js');

export const app = createApp();
export const PASSWORD = 'Password123';

export const startDatabase = async () => {
  await connectDB(process.env.MONGO_URL);
  await mongoose.connection.db.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
};

export const stopDatabase = async () => {
  await mongoose.connection.db.dropDatabase();
  await disconnectDB();
  if (memoryServer) await memoryServer.stop();
};

// Crea un usuario con el rol indicado directamente en la base (los roles
// privilegiados no se pueden obtener por el registro público) y devuelve
// un agente de supertest con la cookie de sesión ya cargada.
export const loginAs = async (role, email = `${role}-${Date.now()}@test.com`) => {
  const user = await UserModel.create({
    first_name: role,
    last_name: 'Test',
    email,
    password: await hashPassword(PASSWORD),
    role,
  });
  const agent = request.agent(app);
  const res = await agent.post('/api/sessions/login').send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`Login de prueba falló (${res.status})`);
  return { agent, user };
};
