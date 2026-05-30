import { adminOnlyMiddleware } from '../../../src/infrastructure/http/middleware/admin-only.middleware';
import { ForbiddenException } from '../../../src/domain/exceptions';

describe('adminOnlyMiddleware', () => {
  it('should pass if user is SuperAdmin', () => {
    const req: any = { user: { isSuperAdmin: true, role: 'TenantUser' } };
    const res: any = {};
    const next = jest.fn();

    adminOnlyMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should pass if user role is Admin', () => {
    const req: any = { user: { isSuperAdmin: false, role: 'Admin' } };
    const res: any = {};
    const next = jest.fn();

    adminOnlyMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should throw ForbiddenException if user is not Admin and not SuperAdmin', () => {
    const req: any = { user: { isSuperAdmin: false, role: 'TenantUser' } };
    const res: any = {};
    const next = jest.fn();

    expect(() => adminOnlyMiddleware(req, res, next)).toThrow(ForbiddenException);
  });
});
