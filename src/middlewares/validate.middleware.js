import { AppError } from '../utils/AppError.js';

const formatIssues = (issues) =>
  issues.map((issue) => ({ field: issue.path.join('.') || '(root)', message: issue.message }));

// Valida body/params/query con esquemas Zod. Los datos parseados (con tipos
// convertidos y claves desconocidas eliminadas) quedan en req.validated.
// En Express 5 req.query es de solo lectura, por eso no se sobrescribe.
export const validate = (schemas) => (req, _res, next) => {
  const validated = {};
  for (const source of ['params', 'query', 'body']) {
    const schema = schemas[source];
    if (!schema) continue;
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      return next(AppError.badRequest('Datos inválidos', formatIssues(result.error.issues)));
    }
    validated[source] = result.data;
  }
  req.validated = validated;
  return next();
};
