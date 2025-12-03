#!/usr/bin/env node
/**
 * Cross-platform script to copy compiled files to dist directory
 * Replaces: mkdir -p dist/compiled && cp -r compiled/* dist/compiled/
 */
const fs = require('node:fs');
const path = require('node:path');

const srcDir = path.resolve(__dirname, '../compiled');
const destDir = path.resolve(__dirname, '../dist/compiled');

/**
 * Recursively copy directory
 */
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Check if source directory exists
if (!fs.existsSync(srcDir)) {
  console.error(`[copy-compiled] Source directory not found: ${srcDir}`);
  process.exit(1);
}

// Copy files
try {
  copyDir(srcDir, destDir);
  console.log(`[copy-compiled] Copied compiled files to ${destDir}`);
} catch (error) {
  console.error('[copy-compiled] Failed to copy files:', error.message);
  process.exit(1);
}
