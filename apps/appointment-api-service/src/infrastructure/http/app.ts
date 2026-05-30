import express from 'express';
import { appointmentRouter } from './routes/appointment.routes';
import { healthRouter } from './routes/health.routes';
import { tenantContextMiddleware } from './middleware/tenant-context.middleware';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware';

const app = express();

app.use(express.json());

// Routes
app.use('/health', healthRouter);

// Protected routes
app.use('/api/v1/appointments', tenantContextMiddleware, appointmentRouter);

// Error handler (must be last)
app.use(errorHandlerMiddleware);

export { app };
