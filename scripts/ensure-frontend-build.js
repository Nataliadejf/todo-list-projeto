const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'web', 'out', 'index.html');

if (!fs.existsSync(indexPath)) {
    console.error('\n[erro] Frontend não encontrado em web/out/index.html');
    console.error('Execute: npm run build\n');
    process.exit(1);
}
