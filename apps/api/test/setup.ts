import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const result = dotenv.config({
  path: fileURLToPath(new URL('../../../.env.test', import.meta.url)),
  override: true,
});

if (result.error) {
  throw new Error(`Failed to load .env.test: ${result.error.message}`);
}

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Tests must run with NODE_ENV=test');
}

const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
const redisUrl = new URL(process.env.REDIS_URL ?? '');

if (databaseUrl.pathname !== '/nekostudy_test') {
  throw new Error('Tests must use the nekostudy_test database');
}

if (redisUrl.pathname !== '/1') {
  throw new Error('Tests must use Redis DB 1');
}
