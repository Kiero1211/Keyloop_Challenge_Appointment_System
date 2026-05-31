import { Router } from 'express';
import { container } from '@/infrastructure/di/container';
import { createAppointmentSchema } from '@/application/commands/create-appointment.command';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const command = createAppointmentSchema.parse(req.body);
    const result = await container.createAppointmentUseCase.execute(command);
    
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});

export const appointmentRouter = router;
