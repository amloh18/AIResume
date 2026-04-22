const { execSync } = require('child_process');
try {
  const out = execSync('npx tsc --noEmit', { encoding: 'utf-8', stdio: 'pipe' });
  console.log('Success');
} catch (e) {
  const errors = e.stdout || e.stderr || e.message;
  const lines = errors.split('\n').filter(l => l.toLowerCase().includes('interview'));
  console.log('Interview errors:');
  console.log(lines.join('\n'));
}