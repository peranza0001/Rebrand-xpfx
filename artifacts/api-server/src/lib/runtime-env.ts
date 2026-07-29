import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export function loadRuntimeEnv(envFile = process.env.ENV_FILE) {
  const resolvedEnvFile = envFile ? path.resolve(envFile) : path.resolve(process.cwd(), '.env');
  if (fs.existsSync(resolvedEnvFile)) {
    dotenv.config({ path: resolvedEnvFile, override: false });
  } else {
    dotenv.config();
  }
  return resolvedEnvFile;
}

export default loadRuntimeEnv;
