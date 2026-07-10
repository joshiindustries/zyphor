const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('route.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src/app/api');
let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('export async function GET') || content.includes('export function GET')) {
    if (!content.includes('export const dynamic')) {
      // Find the last import statement or the beginning of the file
      const importMatches = [...content.matchAll(/^import\s+.*$/gm)];
      let insertIndex = 0;
      if (importMatches.length > 0) {
        const lastMatch = importMatches[importMatches.length - 1];
        insertIndex = lastMatch.index + lastMatch[0].length + 1;
      }
      content = content.slice(0, insertIndex) + '\nexport const dynamic = "force-dynamic";\n' + content.slice(insertIndex);
      fs.writeFileSync(file, content, 'utf8');
      count++;
    }
  }
});
console.log('Fixed ' + count + ' files.');
