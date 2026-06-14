import { writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const functionsDir = '.vercel/output/functions';

if (!existsSync(functionsDir)) {
  console.log('No .vercel/output/functions found, skipping ESM fix');
  process.exit(0);
}

for (const entry of readdirSync(functionsDir)) {
  const dir = join(functionsDir, entry);
  if (!statSync(dir).isDirectory()) continue;

  const pkgPath = join(dir, 'package.json');
  const pkg = existsSync(pkgPath)
    ? JSON.parse(readFileSync(pkgPath, 'utf-8'))
    : {};

  pkg.type = 'module';
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log(`ESM fix applied to ${entry}`);
}
