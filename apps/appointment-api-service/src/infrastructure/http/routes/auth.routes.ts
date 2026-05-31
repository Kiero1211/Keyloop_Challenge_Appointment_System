import { Router } from 'express';
import { container } from '../../di/container';
import { RegisterUseCase } from '../../../application/use-cases/auth/register.use-case';
import { LoginUseCase } from '../../../application/use-cases/auth/login.use-case';
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/refresh-token.use-case';
import { LogoutUseCase } from '../../../application/use-cases/auth/logout.use-case';
import { SwitchTenantUseCase } from '../../../application/use-cases/auth/switch-tenant.use-case';
import { registerSchema, loginSchema, refreshTokenSchema, switchTenantSchema } from '../../../application/commands/auth.command';
import { jwtAuthMiddleware } from '../middleware/jwt-auth.middleware';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const useCase = new RegisterUseCase(
      container.userRepository,
      container.userTenantRepository,
      container.tenantRepository,
      container.refreshTokenRepository,
      container.jwtService
    );
    const result = await useCase.execute(data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const useCase = new LoginUseCase(
      container.userRepository,
      container.userTenantRepository,
      container.refreshTokenRepository,
      container.jwtService
    );
    const result = await useCase.execute(data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const data = refreshTokenSchema.parse(req.body);
    const useCase = new RefreshTokenUseCase(container.refreshTokenRepository, container.jwtService);
    const result = await useCase.execute(data.refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const data = refreshTokenSchema.parse(req.body);
    const useCase = new LogoutUseCase(container.refreshTokenRepository);
    await useCase.execute(data.refreshToken);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Guarded by auth (need to know who is switching)
router.post('/switch-tenant', (req, res, next) => jwtAuthMiddleware(container.jwtService)(req, res, next), async (req, res, next) => {
  try {
    const data = switchTenantSchema.parse(req.body);
    const user = (req as any).user;
    
    const useCase = new SwitchTenantUseCase(
      container.userTenantRepository,
      container.refreshTokenRepository,
      container.jwtService
    );
    
    const result = await useCase.execute(user.userId, data.targetTenantId, data.refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export const authRouter = router;
