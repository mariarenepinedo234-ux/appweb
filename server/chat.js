import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rateLimit } from 'express-rate-limit';
import { db, dataDir, getSettings } from './db.js';
import { requireAdmin } from './auth.js';
import { validateMessages, buildInstructions } from './chat-prompt.js';

db.exec(`CREATE TABLE IF NOT EXISTS chat_settings(id INTEGER PRIMARY KEY CHECK(id=1),content TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS chat_usage(day TEXT PRIMARY KEY,calls INTEGER NOT NULL DEFAULT 0);`);
const defaults={enabled:false,name:'Asistente del estudio',welcome:'Hola. ¿Tienes dudas sobre estilos, preparación, cuidados o tu próximo tatuaje?',knowledge:'',dailyLimit:100};
db.prepare('INSERT OR IGNORE INTO chat_settings(id,content) VALUES(1,?)').run(JSON.stringify(defaults));
export const getChatSettings=()=>({...defaults,...JSON.parse(db.prepare('SELECT content FROM chat_settings WHERE id=1').get().content)});
export function readAIKey(){if(process.env.INKFORMA_AI_KEY?.trim())return process.env.INKFORMA_AI_KEY.trim();try{return readFileSync(join(dataDir,'ai-key.txt'),'utf8').trim();}catch{return '';}}
const today=()=>new Date().toISOString().slice(0,10);
const used=()=>db.prepare('SELECT calls FROM chat_usage WHERE day=?').get(today())?.calls||0;
function error(message,status=400){const result=new Error(message);result.status=status;result.public=true;throw result;}
export function installChat(app,{fetchImpl=globalThis.fetch}={}){
 const limit=rateLimit({windowMs:60*1000,limit:8,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Has enviado varias preguntas. Espera un minuto antes de continuar.'}});
 app.get('/api/chat/status',(req,res)=>{const settings=getChatSettings(),configured=!!readAIKey();res.json({name:settings.name,welcome:settings.welcome,available:settings.enabled&&configured&&used()<settings.dailyLimit});});
 app.get('/api/admin/chat',requireAdmin,(req,res)=>res.json({...getChatSettings(),configured:!!readAIKey(),usedToday:used(),model:'gpt-4.1-mini'}));
 app.put('/api/admin/chat',requireAdmin,(req,res,next)=>{try{
  const old=getChatSettings(),body=req.body;if(!body||typeof body.enabled!=='boolean')error('Indica si el asistente está activado.');
  const text=(key,max,min=0)=>{if(typeof body[key]!=='string'||body[key].trim().length<min||body[key].length>max)error(`El campo ${key} no es válido.`);return body[key].trim();};
  const settings={...old,enabled:body.enabled,name:text('name',60,1),welcome:text('welcome',500,1),knowledge:text('knowledge',8000),dailyLimit:body.dailyLimit};
  if(!Number.isInteger(settings.dailyLimit)||settings.dailyLimit<1||settings.dailyLimit>500)error('El límite diario debe estar entre 1 y 500 preguntas.');
  if(settings.enabled&&!readAIKey())error('Configura primero la clave de IA en el servidor con el asistente de configuración.');
  db.prepare('UPDATE chat_settings SET content=? WHERE id=1').run(JSON.stringify(settings));res.json({...settings,configured:!!readAIKey(),usedToday:used(),model:'gpt-4.1-mini'});
 }catch(problem){next(problem);}});
 app.post('/api/chat',limit,async(req,res,next)=>{
  try{
   const messages=validateMessages(req.body?.messages),settings=getChatSettings(),key=readAIKey();
   if(!settings.enabled||!key)error('El asistente no está disponible. Puedes consultar al estudio o solicitar una cita en Reservas.',503);
   if(used()>=settings.dailyLimit)error('El asistente alcanzó su límite de consultas de hoy. Puedes contactar directamente con el estudio.',429);
   const quota=db.prepare('INSERT INTO chat_usage(day,calls) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET calls=calls+1 WHERE calls<? RETURNING calls').get(today(),settings.dailyLimit);if(!quota)error('El asistente alcanzó su límite de consultas de hoy.',429);
   let response;
   try{response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model:'gpt-4.1-mini',instructions:buildInstructions(getSettings(),settings),input:messages,max_output_tokens:500,store:false}),signal:AbortSignal.timeout(25000)});}catch{error('No se pudo obtener una respuesta de IA. Inténtalo más tarde o contacta con el estudio.',503);}
   if(!response.ok)error('El servicio de IA no pudo responder. Inténtalo más tarde o contacta con el estudio.',503);
   let data;try{data=await response.json();}catch{error('El servicio de IA devolvió una respuesta no disponible. Inténtalo de nuevo.',503);}
   const answer=(data.output||[]).filter(item=>item.type==='message').flatMap(item=>item.content||[]).filter(part=>part.type==='output_text'||part.type==='refusal').map(part=>part.type==='refusal'?part.refusal:part.text).join('\n').trim();
   if(!answer)error('La IA no pudo generar una respuesta. Reformula tu pregunta o contacta con el estudio.',503);
   res.json({answer});
  }catch(problem){next(problem);}
 });
}
