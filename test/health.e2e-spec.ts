import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createTestApp } from './helpers/test-app.helper';

describe('HealthModule (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const testApp = await createTestApp({ withMqtt: true });
    app = testApp.app;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('should return status ok publicly without auth cookie', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<{ status: string }>();
      expect(body.status).toBe('ok');
    });
  });
});
