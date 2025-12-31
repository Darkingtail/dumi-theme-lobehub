// Browser-compatible assert shim for @babel/helper-module-imports
// Must be callable directly as require('assert')(condition) works in Node.js

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Add static methods that Node.js assert module has
assert.ok = function ok(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
};

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || 'Expected ' + expected + ' but got ' + actual);
  }
};

// CommonJS export - allows require('assert') to return the function directly
module.exports = assert;
