/**
 * SMART DIGITAL LOCKER - FRONTEND DEVELOPMENT SERVER
 * Independent HTTP server running on Port 3000 to serve the frontend web application.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  // Normalize URL path to prevent directory traversal
  let safePath = path.normalize(req.url.split('?')[0]).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, safePath);
  const resolvedPath = path.resolve(filePath);

  // Security Check 1: Prevent Directory Traversal outside PUBLIC_DIR
  if (!resolvedPath.startsWith(PUBLIC_DIR + path.sep) && resolvedPath !== PUBLIC_DIR) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied: Directory traversal blocked.');
    return;
  }

  // Security Check 2: Block access to sensitive system files (.env, server.js, package.json, etc.)
  const baseName = path.basename(resolvedPath).toLowerCase();
  if (
    baseName.startsWith('.') ||
    baseName === 'server.js' ||
    baseName === 'package.json' ||
    baseName === 'package-lock.json' ||
    baseName.endsWith('.sqlite') ||
    baseName.endsWith('.env')
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied: Protected resource.');
    return;
  }

  // Fallback to index.html for SPA routes if file does not exist
  if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  } else {
    filePath = resolvedPath;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` SMART DIGITAL LOCKER FRONTEND SERVER `);
  console.log(` Port: ${PORT}`);
  console.log(` URL:  http://localhost:${PORT}`);
  console.log(` Backend Target: http://localhost:5000/api`);
  console.log(`=========================================`);
});
