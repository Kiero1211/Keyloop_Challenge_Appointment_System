import { Router } from 'express';
import { container } from '../../di/container';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await container.healthCheckUseCase.execute();
    if (result.status === 'ok') {
      res.status(200).json(result);
    } else {
      res.status(503).json(result);
    }
  } catch (error) {
    next(error);
  }
});

export const healthRouter = router;
