import { geminiRequest } from '../server/gemini-request.js';
import { readAIKey,model } from '../server/chat.js';
import { geminiError } from '../server/gemini-errors.js';
const key=readAIKey();
console.log(`Diagnóstico de Gemini. Modelo configurado: ${model}`);
const generate=process.argv.includes('--generate');
console.log(generate?'Prueba una generación breve. Usa la cuota del proyecto; no cambia la facturación.':'Consulta los modelos disponibles; no envía conversaciones ni genera respuestas.');
try{
 if(!key)throw Error('Falta la clave. Ejecuta npm.cmd run ai:configure.');
 if(generate){
  const response=await fetch(...geminiRequest(model,key,[{role:'user',content:'Responde únicamente: conexión correcta.'}],'Responde brevemente en español.'));
  const data=await response.json().catch(()=>({}));
  console.log(`Generación directa: HTTP ${response.status}. Modelo usado: ${model}`);
  const status=data.error?.status;
  if(['INVALID_ARGUMENT','UNAUTHENTICATED','PERMISSION_DENIED','NOT_FOUND','RESOURCE_EXHAUSTED','INTERNAL','UNAVAILABLE','FAILED_PRECONDITION'].includes(status))console.log(`Estado de Google: ${status}`);
  if(!response.ok)throw Error(geminiError(response.status,data));
  if(!data.candidates?.[0]?.content?.parts?.some(part=>typeof part.text==='string'&&part.text.trim()&&!part.thought))throw Error('Google respondió sin texto utilizable.');
  console.log('Generación correcta. Si la página falla, comprueba el modelo en Administración → Asistente IA y reinicia el servidor desde esta misma terminal.');
 }else{
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
 }
}catch(error){
 console.error(error.cause||error.name==='TimeoutError'||error.name==='TypeError'?'No se pudo conectar con Google. Revisa Internet, firewall, proxy y acceso HTTPS a generativelanguage.googleapis.com.':error.message);
 process.exitCode=1;
}
