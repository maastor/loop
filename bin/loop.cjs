#!/usr/bin/env node
// Thin launcher so `loop` resolves to the built CLI (out/main/cli.js) after `npm run build`.
// Agents may also invoke the built file directly: `node <repo>/out/main/cli.js <args>`.
require('../out/main/cli.js')
