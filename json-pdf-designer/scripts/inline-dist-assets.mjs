import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'dist', 'json-pdf-designer');
const indexPath = path.join(outputDir, 'index.html');
const externalIndexPath = path.join(outputDir, 'index.external.html');

const escapeInlineScript = (content) => content.replace(/<\/script/gi, '<\\/script');
const escapeInlineStyle = (content) => content.replace(/<\/style/gi, '<\\/style');

async function inlineStyles(html) {
  const stylesheetPattern =
    /<link rel="stylesheet" href="([^"]+)"[^>]*>\s*(?:<noscript>\s*<link rel="stylesheet" href="[^"]+"[^>]*>\s*<\/noscript>)?/g;

  let result = '';
  let lastIndex = 0;

  for (const match of html.matchAll(stylesheetPattern)) {
    const [fullMatch, href] = match;
    const matchIndex = match.index ?? 0;
    const cssPath = path.join(outputDir, href);
    const css = await readFile(cssPath, 'utf8');

    result += html.slice(lastIndex, matchIndex);
    result += `<style>${escapeInlineStyle(css)}</style>`;
    lastIndex = matchIndex + fullMatch.length;
  }

  return result + html.slice(lastIndex);
}

async function inlineScripts(html) {
  const scriptPattern = /<script([^>]*) src="([^"]+)"([^>]*)><\/script>/g;

  let result = '';
  let lastIndex = 0;

  for (const match of html.matchAll(scriptPattern)) {
    const [fullMatch, beforeSrc, src, afterSrc] = match;
    const matchIndex = match.index ?? 0;
    const scriptPath = path.join(outputDir, src);
    const script = await readFile(scriptPath, 'utf8');

    result += html.slice(lastIndex, matchIndex);
    result += `<script${beforeSrc}${afterSrc}>${escapeInlineScript(script)}</script>`;
    lastIndex = matchIndex + fullMatch.length;
  }

  return result + html.slice(lastIndex);
}

async function main() {
  const originalHtml = await readFile(indexPath, 'utf8');
  await writeFile(externalIndexPath, originalHtml);

  const withInlineStyles = await inlineStyles(originalHtml);
  const withInlineAssets = await inlineScripts(withInlineStyles);

  await writeFile(indexPath, withInlineAssets);

  console.log(`Inlined build assets into ${path.relative(projectRoot, indexPath)}`);
  console.log(`Saved original external-asset HTML as ${path.relative(projectRoot, externalIndexPath)}`);
}

await main();
