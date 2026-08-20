import 'dotenv/config';
import dataSource from './config/data-source';
import { ALL_ENTITIES } from './entities';

/**
 * One-off manual backup for the free-tier Postgres plan, which has no built-in
 * automated backups. Dumps every row of every table as JSON to stdout — run this
 * in the Render Shell (where DATABASE_URL is already set) and copy the block
 * between the START/END markers into a local file before running any destructive
 * operation against production.
 */
async function backup() {
  await dataSource.initialize();

  const dump: Record<string, unknown[]> = {};
  for (const entity of ALL_ENTITIES) {
    dump[entity.name] = await dataSource.getRepository(entity).find();
  }

  console.log('===BACKUP-START===');
  console.log(JSON.stringify({ takenAt: new Date().toISOString(), tables: dump }, null, 2));
  console.log('===BACKUP-END===');

  await dataSource.destroy();
}

backup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
