import express from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink, stat } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createServer as createHTTPServer } from 'node:http';
import { db, dataDir, mediaDir, getSettings } from './db.js';
import { installChat } from './chat.js';
import { requireAdmin, sessionFrom, sameOrigin, newSession, setSessionCookie, verifyPassword, tokenHash, hashPassword } from './auth.js';
import { text, email, bool, validateSettings, scheduledTimes, studioNow, validateGlb } from './validation.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const {values:args}=parseArgs({options:{port:{type:'string'},host:{type:'string'},production:{type:'boolean'},strictPort:{type:'boolean'}}});
const production=args.production||process.env.NODE_ENV==='production';
const app=express();const httpServer=createHTTPServer(app);app.disable('x-powered-by');
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');next();});
app.use((req,res,next)=>{if(/^\/(data|server|scripts)(?:\/|$)/.test(req.path)||/\.sqlite(?:-|$)/.test(req.path))return res.sendStatus(404);next();});
app.use('/api',express.json({limit:'64kb'}),sameOrigin,(req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
const wrap=fn=>(req,res,next)=>Promise.resolve().then(()=>fn(req,res)).catch(next);
function fail(message,status=400){const error=new Error(message);error.status=status;throw error;}
function input(fn){try{return fn();}catch(error){error.status=400;throw error;}}
const loginLimit=rateLimit({windowMs:15*60*1000,limit:10,skipSuccessfulRequests:true,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Demasiados intentos. Espera 15 minutos.'}});
const bookingLimit=rateLimit({windowMs:15*60*1000,limit:5,skipSuccessfulRequests:false,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Has enviado varias solicitudes. Espera 15 minutos antes de intentarlo de nuevo.'}});
const dummyHash=hashPassword('unused-timing-placeholder-password');
app.get('/api/health',(req,res)=>res.json({ok:true,database:'sqlite'}));
app.get('/api/site',(req,res)=>res.json(getSettings()));
app.get('/api/auth',(req,res)=>res.json({admin:sessionFrom(req),hasAdmin:!!db.prepare('SELECT id FROM admins LIMIT 1').get()}));
app.post('/api/auth/login',loginLimit,wrap(async(req,res)=>{
 const username=input(()=>email(req.body.email)),password=req.body.password;if(typeof password!=='string'||!password.length||password.length>128)fail('La contraseña no es válida.');
 const admin=db.prepare('SELECT * FROM admins WHERE email=?').get(username);const valid=verifyPassword(password,admin?.password_hash||dummyHash);
 if(!admin||!valid)fail('Correo o contraseña incorrectos.',401);setSessionCookie(req,res,newSession(admin.id));res.json({admin:{id:admin.id,email:admin.email}});
}));
app.post('/api/auth/logout',(req,res)=>{const match=(req.headers.cookie||'').match(/(?:^|;\s*)inkforma_session=([A-Za-z0-9_-]+)/);if(match)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(match[1]));setSessionCookie(req,res,'',0);res.json({ok:true});});
app.post('/api/admin/password',requireAdmin,wrap(async(req,res)=>{
 const password=req.body.password,next=req.body.newPassword;if(typeof password!=='string'||typeof next!=='string'||next.length<12||next.length>128||password.length>128)fail('La nueva contraseña debe tener entre 12 y 128 caracteres.');const account=db.prepare('SELECT password_hash FROM admins WHERE id=?').get(req.admin.id);if(!verifyPassword(password,account.password_hash))fail('La contraseña actual no es correcta.',403);
 db.prepare('UPDATE admins SET password_hash=? WHERE id=?').run(hashPassword(next),req.admin.id);db.prepare('DELETE FROM sessions WHERE admin_id=?').run(req.admin.id);setSessionCookie(req,res,newSession(req.admin.id));res.json({ok:true});
}));
app.put('/api/admin/site',requireAdmin,wrap(async(req,res)=>{const settings=input(()=>validateSettings(req.body,getSettings()));db.prepare('UPDATE settings SET content=? WHERE id=1').run(JSON.stringify(settings));res.json(settings);}));

function galleryRow(row){return {...row,published:!!row.published,url:`/media/${row.filename}`,designUrl:row.design_filename?`/media/${row.design_filename}`:null};}
function modelRow(row){return {...row,published:!!row.published,url:`/media/${row.filename}`};}
app.get('/api/gallery',(req,res)=>res.json(db.prepare('SELECT * FROM gallery WHERE published=1 ORDER BY sort_order,created_at DESC').all().map(galleryRow)));
app.get('/api/models',(req,res)=>res.json(db.prepare('SELECT * FROM body_models WHERE published=1 ORDER BY created_at DESC').all().map(modelRow)));
app.get('/api/admin/gallery',requireAdmin,(req,res)=>res.json(db.prepare('SELECT * FROM gallery ORDER BY sort_order,created_at DESC').all().map(galleryRow)));
app.get('/api/admin/models',requireAdmin,(req,res)=>res.json(db.prepare('SELECT * FROM body_models ORDER BY created_at DESC').all().map(modelRow)));
const imageUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:2,fields:12}}).fields([{name:'image',maxCount:1},{name:'design',maxCount:1}]);
const modelUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:30*1024*1024,files:1,fields:4}}).single('model');
async function saveImage(file){
 if(!file)fail('Selecciona una imagen PNG, JPG o WEBP.');
 if(!['image/png','image/jpeg','image/webp'].includes(file.mimetype))fail('Solo se admiten PNG, JPG o WEBP.');
 let buffer;try{const image=sharp(file.buffer,{limitInputPixels:40000000});const metadata=await image.metadata();if(!['png','jpeg','webp'].includes(metadata.format))throw Error('Formato no admitido');buffer=await image.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer();}catch{fail('La imagen no es válida o supera 40 megapíxeles.');}
 const filename=`${randomUUID()}.webp`;await writeFile(join(mediaDir,filename),buffer,{mode:0o600});return filename;
}
const removeMedia=filename=>unlink(join(mediaDir,filename)).catch(error=>{if(error.code!=='ENOENT')console.error('No se pudo limpiar un archivo multimedia:',error.code);});
function galleryInput(body,old={}){const kind=body.kind??old.kind??'work';if(!['work','studio','artist'].includes(kind))fail('Tipo de publicación no válido.');return input(()=>({kind,title:text(body.title,'Título',120,1),description:text(body.description??'','Descripción',1000),category:text(body.category??'','Estilo',60),published:bool(body.published)?1:0,sort_order:Math.max(-10000,Math.min(10000,Number.parseInt(body.sort_order||'0',10)||0))}));}
app.post('/api/admin/gallery',requireAdmin,imageUpload,wrap(async(req,res)=>{
 const item=galleryInput(req.body),id=randomUUID();let filename,designFilename;
 try{
  filename=await saveImage(req.files?.image?.[0]);
  if(req.files?.design?.[0]){if(item.kind!=='work')fail('El diseño del probador solo se adjunta a trabajos.');designFilename=await saveImage(req.files.design[0]);}
  db.prepare('INSERT INTO gallery(id,title,description,category,filename,published,sort_order,kind,design_filename) VALUES(?,?,?,?,?,?,?,?,?)').run(id,item.title,item.description,item.category,filename,item.published,item.sort_order,item.kind,designFilename??null);
 }catch(error){if(filename)await removeMedia(filename);if(designFilename)await removeMedia(designFilename);throw error;}
 res.status(201).json(galleryRow(db.prepare('SELECT * FROM gallery WHERE id=?').get(id)));
}));
app.put('/api/admin/gallery/:id',requireAdmin,imageUpload,wrap(async(req,res)=>{
 const old=db.prepare('SELECT * FROM gallery WHERE id=?').get(req.params.id);if(!old)fail('La imagen no existe.',404);const item=galleryInput(req.body,old);let filename=old.filename,designFilename=old.design_filename;
 try{
  if(req.files?.image?.[0])filename=await saveImage(req.files.image[0]);
  if(req.files?.design?.[0]){if(item.kind!=='work')fail('El diseño del probador solo se adjunta a trabajos.');designFilename=await saveImage(req.files.design[0]);}
  else if(bool(req.body.removeDesign)||item.kind!=='work')designFilename=null;
  db.prepare('UPDATE gallery SET title=?,description=?,category=?,published=?,sort_order=?,filename=?,kind=?,design_filename=? WHERE id=?').run(item.title,item.description,item.category,item.published,item.sort_order,filename,item.kind,designFilename,old.id);
 }catch(error){if(filename!==old.filename)await removeMedia(filename);if(designFilename&&designFilename!==old.design_filename)await removeMedia(designFilename);throw error;}
 if(filename!==old.filename)await removeMedia(old.filename);if(old.design_filename&&designFilename!==old.design_filename)await removeMedia(old.design_filename);
 res.json(galleryRow(db.prepare('SELECT * FROM gallery WHERE id=?').get(old.id)));
}));
app.delete('/api/admin/gallery/:id',requireAdmin,wrap(async(req,res)=>{const row=db.prepare('SELECT filename,design_filename FROM gallery WHERE id=?').get(req.params.id);if(!row)fail('La imagen no existe.',404);db.prepare('DELETE FROM gallery WHERE id=?').run(req.params.id);await removeMedia(row.filename);if(row.design_filename)await removeMedia(row.design_filename);res.json({ok:true});}));
app.post('/api/admin/models',requireAdmin,modelUpload,wrap(async(req,res)=>{
 const title=input(()=>text(req.body.title,'Nombre del modelo',100,1));if(!req.file)fail('Selecciona un archivo GLB.');input(()=>validateGlb(req.file.buffer));const id=randomUUID(),filename=`${id}.glb`;await writeFile(join(mediaDir,filename),req.file.buffer,{mode:0o600});
 try{db.prepare('INSERT INTO body_models(id,title,filename,published) VALUES(?,?,?,0)').run(id,title,filename);}catch(error){await removeMedia(filename);throw error;}
 res.status(201).json(modelRow(db.prepare('SELECT * FROM body_models WHERE id=?').get(id)));
}));
app.put('/api/admin/models/:id',requireAdmin,wrap(async(req,res)=>{const row=db.prepare('SELECT * FROM body_models WHERE id=?').get(req.params.id);if(!row)fail('El modelo no existe.',404);const title=input(()=>text(req.body.title,'Nombre',100,1));db.prepare('UPDATE body_models SET title=?,published=? WHERE id=?').run(title,bool(req.body.published)?1:0,row.id);res.json(modelRow(db.prepare('SELECT * FROM body_models WHERE id=?').get(row.id)));}));
app.delete('/api/admin/models/:id',requireAdmin,wrap(async(req,res)=>{const row=db.prepare('SELECT filename FROM body_models WHERE id=?').get(req.params.id);if(!row)fail('El modelo no existe.',404);db.prepare('DELETE FROM body_models WHERE id=?').run(req.params.id);await removeMedia(row.filename);res.json({ok:true});}));
app.get('/media/:filename',wrap(async(req,res)=>{
 const filename=req.params.filename;if(!/^[0-9a-f-]{36}\.(webp|glb)$/.test(filename))return res.sendStatus(404);
 const row=db.prepare(filename.endsWith('.glb')?'SELECT published FROM body_models WHERE filename=?':'SELECT published FROM gallery WHERE filename=? OR design_filename=?').get(...(filename.endsWith('.glb')?[filename]:[filename,filename]));
 if(!row||(!row.published&&!sessionFrom(req)))return res.sendStatus(404);
 res.setHeader('Cache-Control',row.published?'public, max-age=300':'private, no-store');if(filename.endsWith('.glb'))res.type('model/gltf-binary');res.sendFile(join(mediaDir,filename));
}));

app.get('/api/availability',wrap(async(req,res)=>{
 const settings=getSettings(),day=req.query.day;const times=input(()=>scheduledTimes(day,settings)),occupied=new Set(db.prepare("SELECT time FROM bookings WHERE day=? AND status IN ('pending','confirmed')").all(day).map(x=>x.time));res.json({day,timezone:settings.timezone,times:times.filter(t=>!occupied.has(t)),today:studioNow(settings.timezone).day});
}));
app.post('/api/bookings',bookingLimit,wrap(async(req,res)=>{
 if(req.body.website)fail('No se pudo procesar la solicitud.');if(req.body.consent!==true)fail('Debes aceptar que el estudio utilice tus datos para gestionar la cita.');
 const item=input(()=>({name:text(req.body.name,'Nombre',100,2),email:email(req.body.email),phone:text(req.body.phone,'Teléfono',40,6),day:text(req.body.day,'Fecha',10,10),time:text(req.body.time,'Hora',5,5),zone:text(req.body.zone,'Zona del tatuaje',80,2),idea:text(req.body.idea,'Tu idea',2000,10)}));
 const settings=getSettings(),times=input(()=>scheduledTimes(item.day,settings));if(!times.includes(item.time))fail('Ese horario no está disponible. Elige otro.',409);
 const id=randomUUID();db.prepare('INSERT INTO bookings(id,name,email,phone,day,time,zone,idea) VALUES(?,?,?,?,?,?,?,?)').run(id,item.name,item.email,item.phone,item.day,item.time,item.zone,item.idea);res.status(201).json({reference:id,status:'pending',day:item.day,time:item.time,timezone:settings.timezone});
}));
app.get('/api/admin/bookings',requireAdmin,(req,res)=>res.json(db.prepare('SELECT * FROM bookings ORDER BY day DESC,time DESC LIMIT 1000').all()));
app.put('/api/admin/bookings/:id',requireAdmin,wrap(async(req,res)=>{
 const old=db.prepare('SELECT * FROM bookings WHERE id=?').get(req.params.id);if(!old)fail('La reserva no existe.',404);const status=input(()=>text(req.body.status,'Estado',20,1));if(!['pending','confirmed','cancelled','completed'].includes(status))fail('Estado no válido.');
 const note=input(()=>text(req.body.admin_note??old.admin_note,'Nota interna',2000)),clientNote=input(()=>text(req.body.client_note??old.client_note,'Observaciones para el cliente',1500)),phone=input(()=>text(req.body.phone??old.phone,'Teléfono',40,6)),day=input(()=>text(req.body.day??old.day,'Fecha',10,10)),time=input(()=>text(req.body.time??old.time,'Hora',5,5));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(new Date(day+'T12:00:00Z').valueOf())||new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))fail('La fecha o la hora no son válidas.');
 if((day!==old.day||time!==old.time||old.status==='cancelled')&&['pending','confirmed'].includes(status)){const times=input(()=>scheduledTimes(day,getSettings()));if(!times.includes(time))fail('La nueva fecha no está dentro del horario de atención.');}
 db.prepare('UPDATE bookings SET status=?,admin_note=?,client_note=?,phone=?,day=?,time=? WHERE id=?').run(status,note,clientNote,phone,day,time,old.id);res.json(db.prepare('SELECT * FROM bookings WHERE id=?').get(old.id));
}));
app.delete('/api/admin/bookings/:id',requireAdmin,(req,res)=>{db.prepare('DELETE FROM bookings WHERE id=?').run(req.params.id);res.json({ok:true});});
installChat(app);
app.use('/api',(req,res)=>res.status(404).json({error:'Operación no disponible.'}));

if(!production){const {createServer}=await import('vite');const vite=await createServer({root,server:{middlewareMode:true,hmr:{server:httpServer},fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/data/**','**/*.sqlite*',`${dataDir}/**`]}},appType:'custom'});app.use(vite.middlewares);app.get(/.*/,wrap(async(req,res)=>{const html=await vite.transformIndexHtml(req.originalUrl,await readFile(join(root,'index.html'),'utf8'));res.type('html').send(html);}));}
else{try{await stat(join(root,'dist/index.html'));}catch{throw Error('Primero ejecuta npm run build.');}app.use(express.static(join(root,'dist'),{index:false}));app.get(/.*/,(req,res)=>res.sendFile(join(root,'dist/index.html')));}
app.use((error,req,res,next)=>{
 if(res.headersSent)return next(error);
 if(error instanceof multer.MulterError)return res.status(400).json({error:error.code==='LIMIT_FILE_SIZE'?'El archivo supera el tamaño permitido (imagen: 10 MB; modelo: 30 MB).':'La carga no es válida.'});
 if(/UNIQUE constraint failed: bookings/.test(error.message))return res.status(409).json({error:'Otra persona acaba de solicitar ese horario. Elige otro.'});
 if(error.type==='entity.parse.failed')return res.status(400).json({error:'Solicitud JSON no válida.'});
 if(error.public&&error.status)return res.status(error.status).json({error:error.message});
 if(error.status&&error.status<500)return res.status(error.status).json({error:error.message});
 console.error('Error de servidor:',error.code||error.name);res.status(500).json({error:'No se pudo completar la operación. Inténtalo de nuevo.'});
});
const port=Number(args.port||process.env.PORT||5173),host=args.host||process.env.HOST||'0.0.0.0';
export const server=httpServer.listen(port,host,()=>console.log(`INKFORMA iniciado en el puerto ${port}. Base de datos SQLite conectada.`));
server.on('error',error=>{console.error('No se pudo iniciar el servidor:',error.code);process.exitCode=1;});
