const { execSync } = require('child_process');
try {
  execSync('npx tsc --noEmit');
  console.log('Success');
} catch (e) {
  const err = e.stdout ? e.stdout.toString() : e.message;
  console.log(err.split('\n').filter(l => l.includes('Step4Review')).join('\n'));
}