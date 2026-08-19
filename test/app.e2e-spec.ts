import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('protects the root endpoint', () => {
    return request(app.getHttpServer()).get('/').expect(401);
  });

  it('rate limits repeated login attempts', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'missing@example.com', password: 'Invalid123!' })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'missing@example.com', password: 'Invalid123!' })
      .expect(429);
  });

  afterAll(async () => {
    await app.close();
  });
});
