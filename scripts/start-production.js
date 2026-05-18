const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'web', 'out', 'index.html');

if (!fs.existsSync(indexPath)) {
    console.warn('web/out não encontrado — executando build do frontend no start...');
    const build = spawnSync('node', ['scripts/build-frontend.js'], {
        cwd: root,
        stdio: 'inherit',
        env: process.env,
    });
    if (build.status !== 0) {
        console.error('Falha ao compilar o frontend.');
        process.exit(build.status || 1);
    }
}

require(path.join(root, 'server.js'));
