import express from 'express';
import { appointmentRouter } from '@/infrastructure/http/routes/appointment.routes';
import { healthRouter } from '@/infrastructure/http/routes/health.routes';
import { serviceTypesRouter } from '@/infrastructure/http/routes/service-types.routes';
import { techniciansRouter } from '@/infrastructure/http/routes/technicians.routes';
import { serviceBaysRouter } from '@/infrastructure/http/routes/service-bays.routes';

import { customersRouter } from '@/infrastructure/http/routes/customers.routes';
import { vehiclesRouter } from '@/infrastructure/http/routes/vehicles.routes';
import { tenantRouter } from '@/infrastructure/http/routes/tenant.routes';
import { authRouter } from '@/infrastructure/http/routes/auth.routes';
import { tenantContextMiddleware } from '@/infrastructure/http/middleware/tenant-context.middleware';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { errorHandlerMiddleware } from '@/infrastructure/http/middleware/error-handler.middleware';
import { jwtAuthMiddleware } from '@/infrastructure/http/middleware/jwt-auth.middleware';
import { container } from '@/infrastructure/di/container';
import { requestLoggerMiddleware } from '@/infrastructure/http/middleware/request-logger.middleware';

const app = express();

app.use(express.json());

// Swagger Docs
const swaggerPath = path.join(__dirname, '../../../openapi.yaml');
let swaggerDocument;
try {
  swaggerDocument = YAML.load(swaggerPath);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  console.warn(`[Swagger] Could not load API documentation from ${swaggerPath}`);
}

// Global middlewares
app.use(requestLoggerMiddleware);
app.use('/health', healthRouter);
app.use('/api/v1/auth', authRouter);

// Protected routes
app.use(
  '/api/v1/appointments',
  (req, res, next) => jwtAuthMiddleware(container.jwtService)(req, res, next),
  tenantContextMiddleware,
  appointmentRouter
);

app.use(
  '/api/v1/service-types',
  (req, res, next) => jwtAuthMiddleware(container.jwtService)(req, res, next),
  tenantContextMiddleware,
  serviceTypesRouter
);

app.use(
  '/api/v1/technicians',
  (req, res, next) => jwtAuthMiddleware(container.jwtService)(req, res, next),
  tenantContextMiddleware,
  techniciansRouter
);

app.use(
  '/api/v1/service-bays',
  (req, res, next) => jwtAuthMiddleware(container.jwtService)(req, res, next),
  tenantContextMiddleware,
  serviceBaysRouter
);



app.use(
  '/api/v1/customers',
  (req, res, next) => jwtAuthMiddleware(container.jwtService)(req, res, next),
  tenantContextMiddleware,
  customersRouter
);

app.use(
  '/api/v1/vehicles',
  (req, res, next) => jwtAuthMiddleware(container.jwtService)(req, res, next),
  tenantContextMiddleware,
  vehiclesRouter
);

app.use('/api/v1/tenants', tenantRouter);

// Error handler (must be last)
app.use(errorHandlerMiddleware);

export { app };
