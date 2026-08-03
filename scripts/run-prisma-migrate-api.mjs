#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';

const schema = path.join(process.cwd(), 'artifacts', 'api-server', 'prisma', 'schema.prisma');
console.log('Running Prisma migrations for API server using schema:', schema);

const res = spawnSync('npx', ['prisma', 'migrate', 'deploy', '--schema=' + schema], { stdio: 'inherit' });
if (res.error) {
  console.error('Migration failed:', res.error);
  process.exit(1);
}
process.exit(res.status ?? 0);
