import { Router } from 'express';
import { container } from '@/infrastructure/di/container';
import { CreateAppointmentUseCase } from '@/application/use-cases/crud/appointment/create-appointment.use-case';
import { CancelAppointmentUseCase } from '@/application/use-cases/crud/appointment/cancel-appointment.use-case';
import { ListAppointmentsUseCase } from '@/application/use-cases/crud/appointment/list-appointments.use-case';
import { GetAppointmentDetailUseCase } from '@/application/use-cases/crud/appointment/get-appointment-detail.use-case';
import { UpdateAppointmentStatusUseCase } from '@/application/use-cases/crud/appointment/update-appointment-status.use-case';
import { updateAppointmentStatusSchema } from '@/application/commands/appointment.command';
import { tenantContext } from '@/domain/context/tenant-context';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const useCase = new CreateAppointmentUseCase(
      container.appointmentCrudRepository,
      container.customerRepository,
      container.vehicleRepository,
      container.serviceTypeRepository,
      container.technicianRepository,
      container.serviceBayRepository
    );
    const result = await useCase.execute(tenantId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const filters = {
      date: req.query.date as string,
      status: req.query.status as string,
      technicianId: req.query.technicianId as string,
      serviceBayId: req.query.serviceBayId as string,
    };
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const tenantId = tenantContext.getStore()!.tenantId;
    const useCase = new ListAppointmentsUseCase(container.appointmentCrudRepository);
    const results = await useCase.execute(tenantId, filters, page, pageSize);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const useCase = new GetAppointmentDetailUseCase(container.appointmentCrudRepository);
    const result = await useCase.execute(tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const command = updateAppointmentStatusSchema.parse(req.body);
    const useCase = new UpdateAppointmentStatusUseCase(container.appointmentCrudRepository);
    const result = await useCase.execute(tenantId, req.params.id, command.status);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = tenantContext.getStore()!.tenantId;
    const useCase = new CancelAppointmentUseCase(container.appointmentCrudRepository);
    const result = await useCase.execute(tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export const appointmentsCrudRouter = router;
