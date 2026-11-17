#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import readline from 'node:readline/promises';
import { Writable } from 'node:stream';
import argon2 from 'argon2';

try {
  process.loadEnvFile?.();
} catch { }

let muted = false;
const mutableStdout = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) {
      process.stdout.write(chunk, encoding);
    }
    callback();
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: mutableStdout,
  terminal: true,
});

async function promptHidden(label) {
  process.stdout.write(label);
  muted = true;
  const answer = await rl.question('');
  muted = false;
  process.stdout.write('\n');
  return answer;
}

try {
  let pepper = process.env.AUTH_PEPPER?.trim() ?? '';

  if (pepper) {
    process.stdout.write('Use AUTH_PEPPER from .env\n');
  } else {
    const inputPepper = await promptHidden(
      'Enter AUTH_PEPPER (leave it empty to auto generate): ',
    );
    pepper = inputPepper.trim() || randomBytes(32).toString('hex');
  }

  const password = await promptHidden('Enter new password: ');
  if (password.length < 8) {
    console.error('\nError: Password must 8 character length.');
    process.exitCode = 1;
  } else {
    const confirm = await promptHidden('Password confirmation: ');

    if (password !== confirm) {
      console.error('\nError: Password not match.');
      process.exitCode = 1;
    } else {
      const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        secret: Buffer.from(pepper),
      });

      console.log('\nSuccess! copy these to .env file:\n');
      console.log(`AUTH_PEPPER="${pepper}"`);
      console.log(`AUTH_PASSWORD_HASH='${hash}'\n`);
    }
  }
} finally {
  rl.close();
}
