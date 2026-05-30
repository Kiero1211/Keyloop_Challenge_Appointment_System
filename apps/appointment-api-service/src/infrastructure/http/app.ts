import express from 'express';
import { appointmentRouter } from './routes/appointment.routes';
import { healthRouter } from './routes/health.routes';
import { serviceTypesRouter } from './routes/service-types.routes';
import { techniciansRouter } from './routes/technicians.routes';
import { serviceBaysRouter } from './routes/service-bays.routes';
import { appointmentsCrudRouter } from './routes/appointments-crud.routes';
import { customersRouter } from './routes/customers.routes';
import { vehiclesRouter } from './routes/vehicles.routes';
import { tenantRouter } from './routes/tenant.routes';
import { tenantContextMiddleware } from './middleware/tenant-context.middleware';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware';
import { jwtAuthMiddleware } from './middleware/jwt-auth.middleware';
import { container } from '../di/container';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware';

const app = express();

app.use(express.json());

// Swagger Docs
const swaggerDocument = YAML.load(path.join(__dirname, '../../../../../../specs/003-multi-tenant-api/contracts/openapi.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Global middlewares
app.use(requestLoggerMiddleware);
app.use('/health', healthRouter);

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
  '/api/v1/crud-appointments',
  (req, res, next) => jwtAuthMiddleware(container.jwtService)(req, res, next),
  tenantContextMiddleware,
  appointmentsCrudRouter
);

app.use('/api/v1/customers', jwtAuthMiddleware(container.jwtService), tenantContextMiddleware, customersRouter);

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
