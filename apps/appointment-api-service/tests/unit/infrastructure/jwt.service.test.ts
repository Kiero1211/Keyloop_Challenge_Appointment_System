import { JwtService } from '../../../src/infrastructure/auth/jwt.service';
import * as jwt from 'jsonwebtoken';

describe('JwtService', () => {
  const secret = 'test-secret';
  const accessExpiresIn = '15m';
  const refreshExpiresIn = '7d';
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService(secret, accessExpiresIn, refreshExpiresIn);
  });

  describe('generateAccessToken', () => {
    it('should sign access token with correct payload claims', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        role: 'Admin',
        permissions: ['read', 'write'],
        isSuperAdmin: false,
      };

      const token = jwtService.generateAccessToken(payload);
      
      const decoded = jwt.verify(token, secret) as any;
      
      expect(decoded.sub).toBe(payload.userId);
      expect(decoded.tenant_id).toBe(payload.tenantId);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.permissions).toEqual(payload.permissions);
      expect(decoded.isSuperAdmin).toBe(payload.isSuperAdmin);
    });
  });

  describe('verifyAccessToken', () => {
    it('should decode valid token', () => {
      const payload = {
        userId: 'user-123',
        tenantId: 'tenant-456',
        role: 'Admin',
        permissions: [],
        isSuperAdmin: false,
      };
      const token = jwtService.generateAccessToken(payload);
      const decoded = jwtService.verifyAccessToken(token);
      
      expect(decoded.sub).toBe(payload.userId);
    });

    it('should throw error on invalid token', () => {
      expect(() => jwtService.verifyAccessToken('invalid.token.here')).toThrow();
    });
  });
});
