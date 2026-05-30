import { Request, Response, NextFunction } from 'express';
import { jwtAuthMiddleware } from '../../../src/infrastructure/http/middleware/jwt-auth.middleware';

describe('jwtAuthMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let mockJwtService = {
    verifyAccessToken: jest.fn(),
  };

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 on missing Bearer token', () => {
    const middleware = jwtAuthMiddleware(mockJwtService as any);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized', message: 'Missing token' });
  });

  it('should return 401 on malformed Authorization header', () => {
    mockRequest.headers = { authorization: 'Basic sometoken' };
    
    const middleware = jwtAuthMiddleware(mockJwtService as any);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 on invalid/expired token', () => {
    mockRequest.headers = { authorization: 'Bearer invalidtoken' };
    mockJwtService.verifyAccessToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const middleware = jwtAuthMiddleware(mockJwtService as any);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized', message: 'Invalid or expired token' });
  });

  it('should attach user payload to request and call next on valid token', () => {
    mockRequest.headers = { authorization: 'Bearer validtoken' };
    const decoded = { sub: 'user-123', tenant_id: 'tenant-456', role: 'User' };
    mockJwtService.verifyAccessToken.mockReturnValue(decoded);

    const middleware = jwtAuthMiddleware(mockJwtService as any);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect((mockRequest as any).user).toEqual({
      userId: decoded.sub,
      tenantId: decoded.tenant_id,
      role: decoded.role,
    });
    expect(nextFunction).toHaveBeenCalled();
  });
});
