const fs = require('fs');
const path = require('path');

const tsxPattern = /export default function (\w+)\(\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*\{\s*id\s*:\s*string\s*\}\s*\}\)\s*\{/g;
const tsPattern = /export async function (\w+)\(([^,]+),\s*\{\s*params\s*\}\s*:\s*\{\s*params\s*:\s*\{\s*id\s*:\s*string\s*\}\s*\}\)\s*\{/g;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src/app');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;

  if (file.endsWith('.tsx') && content.includes('export default function')) {
    if (tsxPattern.test(content)) {
      if (!content.includes('import { use ') && !content.includes('import { use,')) {
        content = content.replace(/from "react";/, ', use } from "react";');
      }
      content = content.replace(tsxPattern, (match, p1) => {
        return `export default function ${p1}(props: { params: Promise<{ id: string }> }) {\n  const params = use(props.params);`;
      });
      modified = true;
    }
  } else if (file.endsWith('.ts') && content.includes('export async function')) {
    if (tsPattern.test(content)) {
      content = content.replace(tsPattern, (match, p1, p2) => {
        return `export async function ${p1}(${p2}, props: { params: Promise<{ id: string }> }) {\n  const params = await props.params;`;
      });
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
});
