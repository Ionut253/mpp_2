require('ts-node').register({
  project: 'tsconfig.seed.json',
  transpileOnly: true
});

require('./seed-stress-test.ts'); 