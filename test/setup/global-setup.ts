import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export default function globalSetup(): void {
  const dataDir = 'data';
  mkdirSync(dataDir, { recursive: true });

  for (const file of readdirSync(dataDir)) {
    if (file.startsWith('tracker.test.db')) {
      rmSync(join(dataDir, file), { force: true });
    }
  }

  execSync('pnpm drizzle-kit push', { stdio: 'inherit' });
}
