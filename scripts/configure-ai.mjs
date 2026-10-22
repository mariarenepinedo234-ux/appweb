import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { stdin,stdout } from 'node:process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dataDir } from '../server/db.js';
let hidden=false;const output=new Writable({write(chunk,encoding,callback){if(!hidden)stdout.write(chunk,encoding);callback();}}),rl=createInterface({input:stdin,output,terminal:true});
try{
 console.log('Configura Gemini con una clave de Google AI Studio: https://aistudio.google.com/apikey' );
 console.log('Usa un proyecto con cuota gratuita disponible y sin facturación activada. Google determina los límites.');
 console.log('La clave quedará en el directorio privado de datos; no se enviará al navegador ni a Git.');
 stdout.write('Pega tu clave API (no se mostrará): ');hidden=true;const key=(await rl.question('')).trim();hidden=false;stdout.write('\n');
 if(!key||key.length<20||key.length>500||/\s/.test(key))throw Error('La clave no tiene un formato válido. No se guardó.');
 writeFileSync(join(dataDir,'gemini-key.txt'),key,{mode:0o600});console.log('Clave guardada. Su validez se comprobará al enviar una consulta. Activa el asistente en Administración → Asistente IA.');
}catch(error){console.error(error.message);process.exitCode=1;}finally{rl.close();}
