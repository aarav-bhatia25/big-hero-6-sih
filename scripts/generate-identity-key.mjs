#!/usr/bin/env node
/**
 * Generates the Ed25519 issuer key used to sign tourist credentials.
 * Prints the line to add to apps/web/.env.local — it is never written for you,
 * so the key does not land in a file by accident.
 */
import { generateKeyPairSync } from 'node:crypto';

const { privateKey } = generateKeyPairSync('ed25519');
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const b64 = Buffer.from(pem).toString('base64');

console.log('\nAdd this to apps/web/.env.local (and .env):\n');
console.log(`IDENTITY_SIGNING_KEY=${b64}\n`);
console.log('Keep it out of git. Rotating it invalidates every issued credential.\n');
