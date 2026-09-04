#!/usr/bin/env node
import { main } from './args.js';

void main(process.argv).then(
  () => {},
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
