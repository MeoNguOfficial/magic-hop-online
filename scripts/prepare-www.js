const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const targetDirs = [
    path.join(rootDir, 'www'),
    path.join(rootDir, 'dist-pc', 'www'),
    path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public')
];

// 1. Quét toàn bộ file .html ở thư mục gốc (index.html, license.html, terms.html, warning.html, beat_editor.html, admin.html, ...)
const rootFiles = fs.readdirSync(rootDir);
const htmlFiles = rootFiles.filter(f => f.toLowerCase().endsWith('.html'));

// 2. Danh sách các file & thư mục tài nguyên cần đồng bộ
const staticFiles = [
    'manifest.json',
    'favicon.ico',
    'apple-touch-icon.png',
    'LICENSE',
    'sw.js',
    'version.json'
];

const staticDirs = [
    'css',
    'js',
    'icons',
    'language',
    'resources'
];

const copyItems = [...htmlFiles, ...staticFiles, ...staticDirs];

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
            copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

targetDirs.forEach(targetDir => {
    if (targetDir.includes('android') && !fs.existsSync(path.dirname(targetDir))) {
        return; // Skip Android if project directory is not present
    }
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    console.log(`[Build] Dang sao chep asset vao ${path.relative(rootDir, targetDir)}/ ...`);
    for (const item of copyItems) {
        const srcPath = path.join(rootDir, item);
        const destPath = path.join(targetDir, item);
        if (fs.existsSync(srcPath)) {
            copyRecursive(srcPath, destPath);
        }
    }
    console.log(`[Build] => Hoan tat dong bo vao ${path.relative(rootDir, targetDir)}/`);
});

console.log('[Build] Da dong bo thanh cong toan bo tai nguyen vao www/, dist-pc/www/ va Android assets!');
