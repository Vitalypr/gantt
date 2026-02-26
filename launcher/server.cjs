const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const net = require('net');

// pkg detects path.join(__dirname, ...) for asset bundling.
// When packaged, __dirname resolves to pkg's virtual snapshot filesystem.
const DIST_DIR = path.resolve(path.join(__dirname, '..', 'dist'));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'",
  'Referrer-Policy': 'no-referrer',
  'X-XSS-Protection': '1; mode=block',
};

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => {
      srv.close();
      resolve(true);
    });
    srv.listen(port, '127.0.0.1');
  });
}

async function findFreePort(start) {
  for (let port = start; port < start + 100; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error('No free port found');
}

function serve(req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, SECURITY_HEADERS);
    res.end('Bad Request');
    return;
  }

  // Reject null bytes (path truncation attack)
  if (urlPath.includes('\0')) {
    res.writeHead(400, SECURITY_HEADERS);
    res.end('Bad Request');
    return;
  }

  if (urlPath === '/') urlPath = '/index.html';

  // Use path.resolve for robust normalization, then verify it's within DIST_DIR
  const filePath = path.resolve(DIST_DIR, urlPath.replace(/^\/+/, ''));

  if (!filePath.startsWith(DIST_DIR + path.sep) && filePath !== DIST_DIR) {
    res.writeHead(403, SECURITY_HEADERS);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    let servePath = filePath;
    if (err || !stat.isFile()) {
      // SPA fallback: serve index.html for unknown routes
      servePath = path.join(DIST_DIR, 'index.html');
    }

    fs.readFile(servePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, SECURITY_HEADERS);
        res.end('Not Found');
        return;
      }
      const ext = path.extname(servePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': contentType });
      res.end(data);
    });
  });
}

async function main() {
  // Check dist folder exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: "dist" folder not found.');
    console.error('Expected at:', DIST_DIR);
    process.exit(1);
  }

  const port = await findFreePort(9473);
  const server = http.createServer(serve);

  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}`;
    console.log(`Gantt Chart running at ${url}`);
    console.log('Press Ctrl+C to stop.');

    // Open in default browser using spawn (no shell injection risk)
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore' });
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore' });
    } else {
      spawn('xdg-open', [url], { stdio: 'ignore' });
    }
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close(() => process.exit(0));
  });
}

main();
