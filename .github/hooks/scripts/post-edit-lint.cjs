// Auto-runs ESLint --fix on files touched by edit tools so lint errors never reach the conversation.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const EDIT_TOOLS = new Set(['replace_string_in_file', 'multi_replace_string_in_file', 'create_file']);
const LINTABLE_EXT = new Set(['.ts', '.tsx', '.cjs', '.js', '.jsx']);

function readStdin() {
  const chunks = [];
  process.stdin.on('data', (c) => chunks.push(c));
  return new Promise((resolve) => {
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function collectFilePaths(input) {
  const toolInput = input.tool_input || {};
  const paths = [];
  if (typeof toolInput.filePath === 'string') paths.push(toolInput.filePath);
  if (Array.isArray(toolInput.replacements)) {
    for (const r of toolInput.replacements) {
      if (typeof r.filePath === 'string') paths.push(r.filePath);
    }
  }
  return [...new Set(paths)];
}

async function main() {
  const raw = await readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  if (!EDIT_TOOLS.has(input.tool_name)) process.exit(0);

  const files = collectFilePaths(input).filter((f) => LINTABLE_EXT.has(path.extname(f)));
  if (files.length === 0) process.exit(0);

  try {
    execFileSync('pnpm', ['exec', 'eslint', '--fix', ...files], {
      cwd: input.cwd || process.cwd(),
      stdio: 'ignore',
      shell: true
    });
  } catch {
    // Non-blocking: remaining lint errors surface via the normal validation step.
  }
  process.exit(0);
}

main();
