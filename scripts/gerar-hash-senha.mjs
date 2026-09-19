#!/usr/bin/env node
// Gera o valor de ADMIN_PASSWORD_HASH / SUPERADMIN_PASSWORD_HASH para colar
// no .env. Uso: node scripts/gerar-hash-senha.mjs "minha-senha-aqui"
import crypto from 'node:crypto';

const password = process.argv[2];

if (!password) {
  console.error('Uso: node scripts/gerar-hash-senha.mjs "sua-senha"');
  process.exit(1);
}

const KEY_LENGTH = 64;
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');

console.log(`${salt}:${hash}`);
