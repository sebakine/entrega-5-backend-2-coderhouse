import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';

try {
  const connection = await connectDB();
  console.log(`[db] Conectado a MongoDB (${connection.name})`);

  const server = createApp().listen(env.PORT, () => {
    console.log(`[server] Escuchando en http://localhost:${env.PORT} (modo ${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} recibido, cerrando...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('[server] No se pudo iniciar:', error.message);
  process.exit(1);
}
