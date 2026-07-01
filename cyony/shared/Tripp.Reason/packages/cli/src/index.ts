/**
 * CLI entry point
 */

import { createCLI } from './main.js';

const program = createCLI();
program.parse();
