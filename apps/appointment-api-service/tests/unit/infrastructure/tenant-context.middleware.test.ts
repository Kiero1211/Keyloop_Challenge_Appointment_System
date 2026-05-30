import { Request, Response, NextFunction } from 'express';
import { tenantContextMiddleware } from '../../../src/infrastructure/http/middleware/tenant-context.middleware';

describe('tenantContextMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: {
        userId: 'user-123',
        tenantId: 'tenant-456',
        role: 'TenantUser',
        isSuperAdmin: false,
      } as any,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should return 400 when x-tenant-id header is absent', () => {
    tenantContextMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Bad Request', message: 'Missing x-tenant-id header' });
  });

  it('should return 403 when x-tenant-id does not match user tenant_id', () => {
    mockRequest.headers = { 'x-tenant-id': 'tenant-789' };

    tenantContextMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Forbidden', message: 'Tenant access denied' });
  });

  it('should pass and set context for matching tenant', () => {
    mockRequest.headers = { 'x-tenant-id': 'tenant-456' };

    tenantContextMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should pass and set context for non-matching tenant if user isSuperAdmin', () => {
    mockRequest.headers = { 'x-tenant-id': 'tenant-789' };
    (mockRequest as any).user.isSuperAdmin = true;

    tenantContextMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    
    expect(nextFunction).toHaveBeenCalled();
  });
});
