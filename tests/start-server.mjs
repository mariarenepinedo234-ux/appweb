// Isolated QA database only; never create test accounts in the real data directory.
import { basename } from 'node:path';
if(process.env.NODE_ENV!=='test'||!process.env.APP_DATA_DIR||!basename(process.env.APP_DATA_DIR).startsWith('inkforma-test-'))throw Error('Se requiere un directorio de pruebas aislado.');
const { db }=await import('../server/db.js');
const { createAdmin }=await import('../server/auth.js');
if(!db.prepare('SELECT id FROM admins LIMIT 1').get())createAdmin('admin@example.test','Only-for-tests-42!');
await import('../server/index.js');
