const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const webDir = path.join(root, 'web');

console.log('Instalando dependências do frontend (inclui devDependencies)...');
execSync('npm install --include=dev', {
    cwd: webDir,
    stdio: 'inherit',
    env: { ...process.env, STATIC_EXPORT: '1' },
});

console.log('Gerando export estático do Next.js...');
execSync('npm run build:export', {
    cwd: webDir,
    stdio: 'inherit',
    env: { ...process.env, STATIC_EXPORT: '1' },
});

console.log('Frontend compilado em web/out');
