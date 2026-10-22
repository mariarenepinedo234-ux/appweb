import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { stdin, stdout } from 'node:process';
import { createAdmin } from '../server/auth.js';
let hidden=false;const output=new Writable({write(chunk,encoding,callback){if(!hidden)stdout.write(chunk,encoding);callback();}});
const rl=createInterface({input:stdin,output,terminal:true});
try{
 const email=await rl.question('Correo del administrador: ');stdout.write('Contraseña (mínimo 12 caracteres; no se mostrará): ');hidden=true;const password=await rl.question('');hidden=false;stdout.write('\nRepite la contraseña: ');hidden=true;const repeated=await rl.question('');hidden=false;stdout.write('\n');
 if(password!==repeated)throw Error('Las contraseñas no coinciden.');createAdmin(email,password);console.log('Cuenta administradora creada. Inicia sesión en /admin.');
}catch(error){console.error(error.message?.includes('UNIQUE constraint failed')?'Ya existe una cuenta con ese correo.':error.message);process.exitCode=1;}finally{rl.close();}
