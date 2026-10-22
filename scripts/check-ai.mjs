import { readAIKey,model } from '../server/chat.js';
import { geminiError } from '../server/gemini-errors.js';
const key=readAIKey();
console.log(`Diagnóstico de Gemini. Modelo configurado: ${model}`);
console.log('Consulta los modelos disponibles; no envía conversaciones ni genera respuestas.');
try{
 if(!key)throw Error('Falta la clave. Ejecuta npm.cmd run ai:configure.');
 let url='https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',models=[];
 for(let page=0;url&&page<10;page++){
  const response=await fetch(url,{headers:{'x-goog-api-key':key},signal:AbortSignal.timeout(20000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(geminiError(response.status,data));
  models.push(...(data.models||[]).filter(item=>item.supportedGenerationMethods?.includes('generateContent')));
  url=data.nextPageToken?`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&pageToken=${encodeURIComponent(data.nextPageToken)}`:'';
 }
 const names=models.map(item=>item.name?.replace(/^models\//,'')).filter(name=>/^[a-zA-Z0-9._-]+$/.test(name));
 if(names.includes(model))console.log('Conexión y acceso a la lista correctos. El modelo configurado figura disponible. Esto no confirma cuota de generación: revísala en Google AI Studio.');
 else {console.log('El modelo configurado no aparece entre los modelos accesibles.');process.exitCode=1;}
 console.log('Modelos de texto Gemini accesibles (comprueba su cuota gratuita antes de elegir):');
 for(const name of names.filter(name=>name.startsWith('gemini-')&&!/image|tts|robotics/.test(name)).slice(0,30))console.log(`- ${name}`);
 console.log('Para elegir un modelo accesible en PowerShell: $env:INKFORMA_GEMINI_MODEL="ID_DEL_MODELO"; después npm.cmd run dev en esa misma terminal.');
}catch(error){
 console.error(error.cause||error.name==='TimeoutError'||error.name==='TypeError'?'No se pudo conectar con Google. Revisa Internet, firewall, proxy y acceso HTTPS a generativelanguage.googleapis.com.':error.message);
 process.exitCode=1;
}
