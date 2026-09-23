import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const TARGET_DIRS = ['public/creators', 'public/logos'];
let totalBefore = 0;
let totalAfter = 0;
let count = 0;

for (const dir of TARGET_DIRS) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (!/\.(png|jpe?g)$/i.test(file)) continue;
    const fullPath = path.join(dir, file);
    const statBefore = fs.statSync(fullPath);
    totalBefore += statBefore.size;

    try {
      if (/\.jpe?g$/i.test(file)) {
        execFileSync('sips', ['-Z', '160', '-s', 'formatOptions', '85', fullPath], { stdio: 'pipe' });
      } else {
        execFileSync('sips', ['-Z', '160', fullPath], { stdio: 'pipe' });
      }
      const statAfter = fs.statSync(fullPath);
      totalAfter += statAfter.size;
      count++;
    } catch (err) {
      console.error(`Failed to process ${fullPath}:`, err.message);
      totalAfter += statBefore.size;
    }
  }
}

console.log(`\nOptimized ${count} images:`);
console.log(`Before: ${(totalBefore / 1024 / 1024).toFixed(2)} MB (${totalBefore.toLocaleString()} bytes)`);
console.log(`After:  ${(totalAfter / 1024 / 1024).toFixed(2)} MB (${totalAfter.toLocaleString()} bytes)`);
const saved = totalBefore - totalAfter;
console.log(`Saved:  ${(saved / 1024 / 1024).toFixed(2)} MB (${((saved / totalBefore) * 100).toFixed(1)}% reduction)`);
