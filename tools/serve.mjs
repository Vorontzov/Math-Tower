import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const port = Number(arg('--port') || 3000), base = arg('--base') || '/';
if (!Number.isInteger(port) || port < 0 || port > 65535 || !/^\/(?:[\w-]+\/)*$/.test(base)) throw new Error('Use --port NUMBER and --base /optional-prefix/');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.md': 'text/plain' };
const server = createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith(base)) { res.writeHead(404); res.end('Not found'); return; }
    const relative = pathname.slice(base.length);
    if (relative.split('/').some(p => p.startsWith('.'))) { res.writeHead(403); res.end('Forbidden'); return; }
    let path = resolve(root, relative || 'index.html');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    path = await realpath(path);
    if (!path.startsWith(root + sep)) { res.writeHead(403); res.end('Forbidden'); return; }
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': `${mime[extname(path)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Math Tower development server listening on port ${server.address().port}; base ${base}`));
