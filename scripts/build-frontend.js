const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const webDir = path.join(root, 'web');
const indexPath = path.join(webDir, 'out', 'index.html');
const buildEnv = {
    ...process.env,
    STATIC_EXPORT: '1',
    NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=512',
};

console.log('Instalando dependências do frontend (inclui devDependencies)...');
execSync('npm install --include=dev', {
    cwd: webDir,
    stdio: 'inherit',
    env: buildEnv,
});

console.log('Gerando export estático do Next.js (webpack)...');
execSync('npm run build:export', {
    cwd: webDir,
    stdio: 'inherit',
    env: buildEnv,
});

if (!fs.existsSync(indexPath)) {
    console.error('ERRO: web/out/index.html não foi criado.');
    process.exit(1);
}

console.log('Frontend compilado em web/out');
