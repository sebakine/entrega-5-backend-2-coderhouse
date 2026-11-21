import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

export const notFoundHandler = (req, _res, next) => {
  next(AppError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

// Punto único de salida de errores. Los AppError (401, 403, 404...) conservan su
// código; solo lo verdaderamente inesperado termina en 500 y se loguea.
export const errorHandler = (err, _req, res, _next) => {
  let statusCode = 500;
  let message = 'Error interno del servidor';
  let details;

  if (err instanceof AppError) {
    ({ statusCode, message, details } = err);
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Datos inválidos';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Valor inválido para ${err.path}`;
  } else if (err?.code === 11000) {
    statusCode = 409;
    message = 'Registro duplicado';
  } else if (err?.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'JSON mal formado';
  }

  if (statusCode >= 500) console.error('[error]', err);

  const body = { status: 'error', message };
  if (details !== undefined) body.details = details;
  res.status(statusCode).json(body);
};
