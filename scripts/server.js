const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4173;
const ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg'
};

function handleRequest(req, res) {
    let cleanUrl = req.url.split('?')[0].split('#')[0];
    if (cleanUrl === '/') cleanUrl = '/index.html';
    let filePath = path.join(ROOT, decodeURIComponent(cleanUrl));

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    const isRestrictedToolRoute = /^\/(admin|beat-editor|beat_editor\.html|admin\.html|js\/ui\/admin-panel\.js|js\/audio\/beat-editor\.js|css\/admin-style\.css|css\/beat-editor\.css)(\/|$)/i.test(cleanUrl);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const notFoundHeaders = { 'Content-Type': 'text/plain' };
        if (isRestrictedToolRoute) {
            notFoundHeaders['X-Robots-Tag'] = 'noindex, nofollow, noarchive, nosnippet, noimageindex';
        }
        res.writeHead(404, notFoundHeaders);
        res.end('404 Not Found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = {
        'Content-Type': mime,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
    };
    if (isRestrictedToolRoute) {
        headers['X-Robots-Tag'] = 'noindex, nofollow, noarchive, nosnippet, noimageindex';
        headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    }
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(handleRequest);

if (require.main === module) {
    server.listen(PORT, '127.0.0.1', () => {
        console.log(`[CyberBeatHopper] Local app server running at http://127.0.0.1:${PORT}`);
    });
}

module.exports = { server, handleRequest };

