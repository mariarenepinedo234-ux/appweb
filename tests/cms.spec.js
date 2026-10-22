import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const origin='http://127.0.0.1:5195';
const credentials={email:'admin@example.test',password:'Only-for-tests-42!'};
const headers={Origin:origin};
async function adminLogin(request){const response=await request.post('/api/auth/login',{headers,data:credentials});expect(response.status()).toBe(200);}
async function loginPage(page){await page.goto('/admin');await page.getByLabel('Correo electrónico',{exact:true}).fill(credentials.email);await page.getByLabel('Contraseña',{exact:true}).fill(credentials.password);await page.getByRole('button',{name:'Entrar al panel'}).click();await expect(page.getByRole('heading',{name:'Tu estudio, en un vistazo.'})).toBeVisible();}
async function available(request){
 const site=await (await request.get('/api/site')).json();
 for(let offset=2;offset<10;offset++){
  const date=new Date();date.setUTCDate(date.getUTCDate()+offset);const day=date.toISOString().slice(0,10),response=await request.get(`/api/availability?day=${day}`);const result=await response.json();if(result.times?.length)return {day,time:result.times[0],site};
 }
 throw Error('No hay horarios de prueba');
}
const png=()=>sharp({create:{width:40,height:50,channels:4,background:{r:40,g:60,b:35,alpha:1}}}).png().toBuffer();

test('server permissions, CSRF, draft privacy and safe image validation',async({request,playwright})=>{
 const anon=await playwright.request.newContext({baseURL:origin});
 expect((await anon.get('/api/admin/bookings')).status()).toBe(401);
 expect((await anon.put('/api/admin/site',{headers,data:{brandName:'Ataque'}})).status()).toBe(401);
 expect((await anon.post('/api/admin/gallery',{headers,data:{title:'Ataque'}})).status()).toBe(401);
 await adminLogin(request);
 const cookie=(await request.storageState()).cookies.find(x=>x.name==='inkforma_session');expect(cookie.httpOnly).toBe(true);expect(cookie.sameSite).toBe('Strict');
 expect((await request.put('/api/admin/site',{headers:{Origin:'https://otro.example'},data:{brandName:'Ataque'}})).status()).toBe(403);
 const bad=await request.post('/api/admin/gallery',{headers,multipart:{title:'No válida',image:{name:'fake.png',mimeType:'image/png',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40"/></svg>')}}});expect(bad.status()).toBe(400);
 const response=await request.post('/api/admin/gallery',{headers,multipart:{title:'Borrador privado',category:'Geométrico',published:'false',image:{name:'work.png',mimeType:'image/png',buffer:await png()}}});expect(response.status()).toBe(201);const image=await response.json();
 expect((await anon.get(image.url)).status()).toBe(404);expect((await request.get(image.url)).status()).toBe(200);
 expect((await anon.get('/api/gallery')).status()).toBe(200);expect((await (await anon.get('/api/gallery')).json()).some(x=>x.id===image.id)).toBe(false);
 const published=await request.put(`/api/admin/gallery/${image.id}`,{headers,data:{title:'Trabajo publicado',description:'Edición desde el panel',category:'Geométrico',published:true}});expect(published.status()).toBe(200);
 expect((await anon.get(image.url)).headers()['content-type']).toContain('image/webp');
 expect((await (await anon.get('/api/gallery')).json()).some(x=>x.id===image.id)).toBe(true);
 expect((await request.delete(`/api/admin/gallery/${image.id}`,{headers})).status()).toBe(200);expect((await anon.get(image.url)).status()).toBe(404);
 expect((await anon.get('/data/inkforma.sqlite')).status()).toBe(404);expect((await anon.get('/@fs/workspace/appweb/data/inkforma.sqlite')).status()).not.toBe(200);
 await request.post('/api/auth/logout',{headers});expect((await request.get('/api/admin/bookings')).status()).toBe(401);await anon.dispose();
});

test('booking requests are private, prevent double booking and release cancelled slots',async({request,playwright})=>{
 const client=await playwright.request.newContext({baseURL:origin});const {day,time}=await available(client);
 const details={name:'Cliente de prueba',email:'client@example.test',phone:'+591 70000000',day,time,zone:'Antebrazo',idea:'Quiero un brazalete geométrico.',consent:true};
 const first=await client.post('/api/bookings',{headers,data:details});expect(first.status()).toBe(201);const result=await first.json();expect(result.status).toBe('pending');expect(result.email).toBeUndefined();
 expect((await client.get('/api/admin/bookings')).status()).toBe(401);
 expect((await client.post('/api/bookings',{headers,data:details})).status()).toBe(409);
 const slots=await (await client.get(`/api/availability?day=${day}`)).json();expect(slots.times).not.toContain(time);
 await adminLogin(request);const all=await (await request.get('/api/admin/bookings')).json();expect(all.find(x=>x.id===result.reference).email).toBe(details.email);
 const confirmed=await request.put(`/api/admin/bookings/${result.reference}`,{headers,data:{status:'confirmed',admin_note:'Contactar por teléfono'}});expect((await confirmed.json()).status).toBe('confirmed');
 await request.put(`/api/admin/bookings/${result.reference}`,{headers,data:{status:'cancelled'}});
 expect((await (await client.get(`/api/availability?day=${day}`)).json()).times).toContain(time);
 expect((await client.post('/api/bookings',{headers,data:{...details,consent:false}})).status()).toBe(400);
 expect((await request.delete(`/api/admin/bookings/${result.reference}`,{headers})).status()).toBe(200);await client.dispose();
});

test('admin edits public content and gallery through the real dashboard',async({page,request})=>{
 await loginPage(page);await page.getByRole('button',{name:'Contenido y horarios',exact:true}).click();
 await page.getByLabel('Nombre del estudio',{exact:true}).fill('Estudio de prueba');await page.getByRole('button',{name:'Guardar contenido y horarios'}).click();await expect(page.locator('#admin-message')).toContainText('Contenido guardado');
 await page.getByRole('button',{name:'Galería',exact:true}).click();await page.getByLabel('Título',{exact:true}).fill('Diseño publicado desde el panel');await page.getByLabel('Nueva categoría',{exact:true}).fill('Geométrico QA');await page.getByRole('button',{name:'Crear categoría',exact:true}).click();await expect(page.locator('#admin-message')).toContainText('Categoría creada');await page.getByLabel('Título',{exact:true}).fill('Diseño publicado desde el panel');await page.getByLabel('Categoría del tatuaje').selectOption({label:'Geométrico QA'});
 await page.locator('input[name=image]').setInputFiles({name:'gallery.png',mimeType:'image/png',buffer:await png()});await page.getByLabel('Publicar en la galería',{exact:true}).check();await page.getByRole('button',{name:'Subir imagen',exact:true}).click();await expect(page.locator('#admin-message')).toContainText('Trabajo guardado');
 await page.goto('/');await expect(page.locator('header .brand')).toContainText('Estudio de prueba');await expect(page.getByRole('heading',{name:'Diseño publicado desde el panel',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Ver Diseño publicado desde el panel',exact:true}).click();await expect(page.locator('#gallery-dialog')).toBeVisible();await page.getByRole('button',{name:'Cerrar imagen'}).click();
 await adminLogin(request);await request.put('/api/admin/site',{headers,data:{brandName:'INKFORMA'}});
 const rows=await (await request.get('/api/admin/gallery')).json();for(const row of rows)await request.delete(`/api/admin/gallery/${row.id}`,{headers});
});

test('a visitor can request a slot and the administrator can manage it',async({page,request})=>{
 await page.goto('/');await page.getByLabel('Tu nombre',{exact:true}).fill('Reserva desde la web');await page.getByLabel('Correo electrónico',{exact:true}).fill('visitor@example.test');await page.getByLabel('Teléfono o WhatsApp').fill('70012345');await page.getByLabel('Zona del tatuaje',{exact:true}).selectOption('Antebrazo');
 await expect(page.locator('#booking-time')).toBeEnabled();const time=await page.locator('#booking-time option').nth(1).getAttribute('value');await page.locator('#booking-time').selectOption(time);await page.getByLabel('Cuéntanos tu idea').fill('Quiero diseñar un brazalete con líneas finas.');await page.getByLabel('Acepto que el estudio').check();await page.getByRole('button',{name:'Solicitar reserva'}).click();await expect(page.locator('#booking-result')).toContainText('Solicitud recibida');
 await loginPage(page);await page.getByRole('button',{name:'Reservas',exact:true}).click();const booking=page.locator('.booking-admin-card').filter({hasText:'Reserva desde la web'});await booking.locator('summary').click();await booking.getByLabel('Estado',{exact:true}).selectOption('confirmed');await booking.getByRole('button',{name:'Guardar reserva'}).click();await expect(page.locator('#admin-message')).toContainText('Reserva actualizada');
 await adminLogin(request);const rows=await (await request.get('/api/admin/bookings')).json();expect(rows.find(x=>x.name==='Reserva desde la web').status).toBe('confirmed');for(const row of rows)await request.delete(`/api/admin/bookings/${row.id}`,{headers});
});

test('admin GLB upload, publication and the public custom model picker work',async({page,request})=>{
 await adminLogin(request);const buffer=await readFile('public/models/male.glb');
 // Convert the bundled file to a single visible variant for this upload fixture.
 const length=buffer.readUInt32LE(12),data=JSON.parse(buffer.subarray(20,20+length).toString());data.scenes[0].nodes=[data.scenes[0].nodes[1]];
 const json=Buffer.from(JSON.stringify(data));const padding=Buffer.alloc((4-json.length%4)%4,32),chunk=Buffer.concat([json,padding]),binary=buffer.subarray(20+length);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+chunk.length+binary.length,8);header.writeUInt32LE(chunk.length,12);header.writeUInt32LE(0x4e4f534a,16);const modelBuffer=Buffer.concat([header,chunk,binary]);
 const uploaded=await request.post('/api/admin/models',{headers,multipart:{title:'Modelo del estudio QA',model:{name:'body.glb',mimeType:'model/gltf-binary',buffer:modelBuffer}}});expect(uploaded.status()).toBe(201);const model=await uploaded.json();
 const anon=await page.request.get(model.url);expect(anon.status()).toBe(404);
 await request.put(`/api/admin/models/${model.id}`,{headers,data:{title:model.title,published:true}});
 await page.goto('/');await expect(page.locator('#custom-model option').filter({hasText:model.title})).toHaveCount(1);await page.locator('#custom-model').selectOption(model.id);await expect(page.locator('#canvas')).toHaveAttribute('data-body-model',`custom-${model.id}`);await expect(page.locator('#zone')).toBeDisabled();await expect(page.locator('#application option[value=band]')).toHaveJSProperty('disabled',true);
 await page.locator('#custom-model').selectOption('builtin');await expect(page.locator('#zone')).toBeEnabled();await expect(page.locator('#canvas')).toHaveAttribute('data-body-model','male-media');
 await request.delete(`/api/admin/models/${model.id}`,{headers});
});
