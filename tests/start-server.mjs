// Isolated QA database only; never create test accounts in the real data directory.
import { basename } from 'node:path';
if(process.env.NODE_ENV!=='test'||!process.env.APP_DATA_DIR||!basename(process.env.APP_DATA_DIR).startsWith('inkforma-test-'))throw Error('Se requiere un directorio de pruebas aislado.');
const { db }=await import('../server/db.js');
const { createAdmin }=await import('../server/auth.js');
if(!db.prepare('SELECT id FROM admins LIMIT 1').get())createAdmin('admin@example.test','Only-for-tests-42!');
// Only this guarded test bootstrap replaces the paid provider; normal startup never does.
process.env.INKFORMA_AI_KEY='qa-fixture-not-a-real-provider-key';
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(url!=='https://api.openai.com/v1/responses')return originalFetch(url,options);
 const body=JSON.parse(options.body),question=body.input.at(-1).content;
 if(question==='__UPSTREAM_ERROR__')return new Response(JSON.stringify({error:{message:'PRIVATE_UPSTREAM_DETAIL'}}),{status:401});
 if(body.model!=='gpt-4.1-mini'||body.store!==false||!body.instructions.includes('exclusivamente tatuajes'))return new Response('{}',{status:400});
 return new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:question.includes('precio')?'No tengo una tarifa publicada. Consulta al estudio para valorar tu diseño.':'Para preparar tu piel, sigue las indicaciones del tatuador y evita acudir con la zona irritada.'}]}]}),{headers:{'Content-Type':'application/json'}});
};
await import('../server/index.js');
