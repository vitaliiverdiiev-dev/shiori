import { defineConfig } from 'drizzle-kit';
import { connection } from './drizzle.config.js';

// Studio browses the live database, so it needs no schema files.
export default defineConfig(connection);
