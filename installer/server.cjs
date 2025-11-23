#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const port = process.env.PORT || 4173;
const baseDir = path.resolve(__dirname, '../dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json'
};

const safePath = (requestPath) => {
  const filePath = path.join(baseDir, requestPath);
  if (!filePath.startsWith(baseDir)) {
    return null;
  }
  return filePath;
};

const serveFile = (filePath, res) => {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  let requestPath = decodeURIComponent(url.pathname);

  if (requestPath.endsWith('/')) {
    requestPath = path.join(requestPath, 'index.html');
  }

  const candidatePath = safePath(requestPath);
  if (candidatePath && fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    serveFile(candidatePath, res);
    return;
  }

  const fallbackPath = safePath('/index.html');
  if (fallbackPath) {
    serveFile(fallbackPath, res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const openBrowser = (url) => {
  const platform = process.platform;
  if (platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url]);
  } else if (platform === 'darwin') {
    spawn('open', [url]);
  } else {
    const possibleBrowsers = ['xdg-open', 'gio', 'sensible-browser'];
    for (const command of possibleBrowsers) {
      const proc = spawn(command, [url]);
      proc.on('error', () => {});
      proc.unref();
      return;
    }
  }
};

server.listen(port, () => {
  console.log(`EchoFlow installer server running at http://localhost:${port}`);
  openBrowser(`http://localhost:${port}`);
});
