#!/usr/bin/env node

import {installOutputErrorHandler, main} from './src/cli.ts';

installOutputErrorHandler();
await main(process.argv.slice(2));
