// Isolated QA database only; never create test accounts in the real data directory.
import { basename } from 'node:path';
if(process.env.NODE_ENV!=='test'||!process.env.APP_DATA_DIR||!basename(process.env.APP_DATA_DIR).startsWith('inkforma-test-'))throw Error('Se requiere un directorio de pruebas aislado.');
const { db }=await import('../server/db.js');
const { createAdmin }=await import('../server/auth.js');
if(!db.prepare('SELECT id FROM admins LIMIT 1').get())createAdmin('admin@example.test','Only-for-tests-42!');
// Only this guarded test bootstrap replaces the external provider; normal startup never does.
process.env.INKFORMA_GEMINI_KEY='qa-fixture-not-a-real-provider-key';
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(url!=='https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent')return originalFetch(url,options);
 const body=JSON.parse(options.body),question=body.contents.at(-1).parts[0].text;
 if(question==='__QUOTA__')return new Response('{}',{status:429});
 if(question==='__EMPTY__')return new Response(JSON.stringify({candidates:[]}));
 if(question==='__UPSTREAM_ERROR__')return new Response(JSON.stringify({error:{message:'PRIVATE_UPSTREAM_DETAIL'}}),{status:401});
 if(options.headers['x-goog-api-key']!==process.env.INKFORMA_GEMINI_KEY||!body.systemInstruction.parts[0].text.includes('exclusivamente tatuajes')||body.generationConfig.maxOutputTokens!==500||body.contents.some((item,index)=>item.role!==(index%2?'model':'user')))return new Response('{}',{status:400});
 return new Response(JSON.stringify({candidates:[{content:{parts:[{text:question.includes('precio')?'No tengo una tarifa publicada. Consulta al estudio para valorar tu diseño.':'Para preparar tu piel, sigue las indicaciones del tatuador y evita acudir con la zona irritada.'}]}}]}),{headers:{'Content-Type':'application/json'}});
};
await import('../server/index.js');
