import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

function findNearestEnvFile(startDir: string): string | undefined {
  let currentDir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(currentDir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
  return undefined;
}

export function loadRuntimeEnv(envFile = process.env.ENV_FILE) {
  const isProduction = (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';

  if (isProduction) {
    return envFile ? path.resolve(envFile) : undefined;
  }

  const resolvedEnvFile = envFile
    ? path.resolve(envFile)
    : findNearestEnvFile(process.cwd()) ?? path.resolve(process.cwd(), '.env');

  if (fs.existsSync(resolvedEnvFile)) {
    dotenv.config({ path: resolvedEnvFile, override: false });
  } else {
    dotenv.config();
  }
  return resolvedEnvFile;
}

export default loadRuntimeEnv;
