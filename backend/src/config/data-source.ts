import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ALL_ENTITIES } from '../entities';

/**
 * Render (and most managed Postgres providers) expose a single DATABASE_URL
 * connection string rather than discrete host/port/user/pass — and require SSL
 * for it. Local dev keeps using the discrete DB_* vars from .env (see docker-compose.yml).
 */
const connectionOptions: DataSourceOptions = process.env.DATABASE_URL
  ? {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME ?? 'transfer_system',
      password: process.env.DB_PASSWORD ?? 'transfer_system',
      database: process.env.DB_NAME ?? 'transfer_system',
    };

export const dataSourceOptions: DataSourceOptions = {
  ...connectionOptions,
  entities: ALL_ENTITIES,
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  synchronize: false,
};

/** Used by the `typeorm` CLI (migration:generate / migration:run) — see package.json scripts. */
export default new DataSource(dataSourceOptions);
