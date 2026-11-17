import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp, TEST_AUTH } from './helpers/test-app.helper';

describe('AuthModule (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should reject invalid credentials with HTTP 401 and no cookie', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'cf-connecting-ip': '198.51.100.10' },
        payload: {
          username: TEST_AUTH.username,
          password: 'wrong-password',
        },
      });

      expect(response.statusCode).toBe(401);
      const tokenCookie = response.cookies.find(
        (c) => c.name === 'access_token',
      );
      expect(tokenCookie).toBeUndefined();
    });

    it('should reject empty payload with HTTP 400 (ZodValidationPipe)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'cf-connecting-ip': '198.51.100.11' },
        payload: {
          username: '',
          password: '',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should authenticate valid user and set HttpOnly access_token cookie', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'cf-connecting-ip': '198.51.100.12' },
        payload: {
          username: TEST_AUTH.username,
          password: TEST_AUTH.password,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        authenticated: true,
        user: { username: TEST_AUTH.username },
      });

      const tokenCookie = response.cookies.find(
        (c) => c.name === 'access_token',
      );
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie?.httpOnly).toBe(true);
      expect(tokenCookie?.path).toBe('/');
    });

    it('should block excessive login attempts with HTTP 429 (LoginThrottlerGuard)', async () => {
      const attackerIp = '203.0.113.99';
      const limit = Number(process.env.THROTTLE_LOGIN_LIMIT ?? 5);

      for (let i = 0; i < limit; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          headers: { 'cf-connecting-ip': attackerIp },
          payload: {
            username: TEST_AUTH.username,
            password: 'wrong-password',
          },
        });
        expect(res.statusCode).toBe(401);
      }

      const blockedResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'cf-connecting-ip': attackerIp },
        payload: {
          username: TEST_AUTH.username,
          password: TEST_AUTH.password,
        },
      });

      expect(blockedResponse.statusCode).toBe(429);
    });
  });

  describe('GET /api/v1/auth & POST /api/v1/auth/logout', () => {
    it('should reject unauthenticated GET /api/v1/auth with HTTP 401', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should verify session with valid cookie and clear cookie on logout', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'cf-connecting-ip': '198.51.100.13' },
        payload: {
          username: TEST_AUTH.username,
          password: TEST_AUTH.password,
        },
      });

      const tokenCookie = loginRes.cookies.find(
        (c) => c.name === 'access_token',
      );
      const cookieHeader = `access_token=${tokenCookie!.value}`;

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/v1/auth',
        headers: { cookie: cookieHeader },
      });

      expect(meRes.statusCode).toBe(200);
      expect(meRes.json()).toEqual({
        authenticated: true,
        user: { username: TEST_AUTH.username },
      });

      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { cookie: cookieHeader },
      });

      expect(logoutRes.statusCode).toBe(200);
      expect(logoutRes.json()).toEqual({ authenticated: false });

      const clearedCookie = logoutRes.cookies.find(
        (c) => c.name === 'access_token',
      );
      expect(clearedCookie?.value).toBe('');
    });
  });
});
