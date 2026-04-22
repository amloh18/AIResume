const fs = require('fs');
console.log(fs.readFileSync('src/lib/pill-engine/CentralScoreManager.ts', 'utf-8').slice(0, 1000));
