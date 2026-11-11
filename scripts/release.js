const { cpSync, existsSync, mkdirSync, readFileSync, rmSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = resolve(__dirname, '..');
const distPath = join(projectRoot, 'dist');
const manifestPath = join(distPath, 'manifest.json');
const stagingRoot = join(projectRoot, '.release');
const stagingPath = join(stagingRoot, 'olx-map');

if (!existsSync(manifestPath)) {
  throw new Error(`Missing manifest: ${manifestPath}`);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (!manifest.version) {
  throw new Error('Manifest version is missing');
}

const archivePath = join(projectRoot, `olx-map-${manifest.version}.zip`);

rmSync(stagingRoot, { recursive: true, force: true });
mkdirSync(stagingPath, { recursive: true });
cpSync(distPath, stagingPath, { recursive: true });
rmSync(archivePath, { force: true });

const powershellScript = [
  '$ErrorActionPreference = "Stop"',
  `Compress-Archive -Path '${stagingPath.replaceAll("'", "''")}' -DestinationPath '${archivePath.replaceAll("'", "''")}'`,
].join('; ');

const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', powershellScript], {
  stdio: 'inherit',
});

rmSync(stagingRoot, { recursive: true, force: true });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Created ${archivePath}`);
