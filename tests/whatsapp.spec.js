import { spawnSync } from 'node:child_process';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { bookingMessage,whatsappLink,whatsappNumber } from '../src/whatsapp.js';
const headers={Origin:'http://127.0.0.1:5195'};

test('WhatsApp requires explicit international numbers and never copies internal booking notes',()=>{
 for(const value of ['+591 7001-2345','00591 (7001) 2345'])expect(whatsappNumber(value)).toBe('59170012345');
 for(const value of ['70012345','+000123456','+5917','javascript:alert(1)','+591 70012345 ext 2','+591123456789012345'])expect(whatsappNumber(value)).toBeNull();
 const base={id:'abcdefgh-1234',name:'Ana & Luz',day:'2026-11-03',time:'15:00',client_note:'Trae tu referencia & confirma si necesitas cambiar.',admin_note:'SECRET_INTERNAL_NOTE'};
 for(const status of ['pending','confirmed','cancelled','completed']){const message=bookingMessage({...base,status},{brandName:'Estudio QA'}),url=new URL(whatsappLink('+591 70012345',message));expect(url.hostname).toBe('wa.me');expect(url.pathname).toBe('/59170012345');expect(url.searchParams.get('text')).toBe(message);expect(message).toContain('03/11/2026');expect(message).not.toContain('SECRET_INTERNAL_NOTE');}
 expect(bookingMessage({...base,status:'pending'},{brandName:'QA'})).toContain('todavía no es una cita confirmada');
 expect(whatsappLink('70012345','Hola')).toBeNull();expect(whatsappLink('+59170012345','   ')).toBeNull();
});

test('admin saves client observations, reviews an editable WhatsApp message and opens only on explicit click',async({page,request,playwright})=>{
 const site=await (await request.get('/api/site')).json();let slot;
 for(let offset=4;offset<12;offset++){const date=new Date();date.setUTCDate(date.getUTCDate()+offset);const day=date.toISOString().slice(0,10),available=await(await request.get(`/api/availability?day=${day}`)).json();if(available.times?.length){slot={day,time:available.times[0]};break;}}
 expect(slot).toBeTruthy();
 const created=await request.post('/api/bookings',{headers,data:{...slot,name:'Cliente WhatsApp QA',email:'whatsapp@example.test',phone:'70012345',zone:'Antebrazo',idea:'Consulta para un diseño botánico.',consent:true}});expect(created.status()).toBe(201);const booking=await created.json();
 await request.post('/api/auth/login',{headers,data:{email:'admin@example.test',password:'Only-for-tests-42!'}});
 const anon=await playwright.request.newContext({baseURL:'http://127.0.0.1:5195'});
 try{
  expect((await anon.get('/api/admin/bookings')).status()).toBe(401);
  await page.context().addCookies((await request.storageState()).cookies);await page.goto('/admin');await page.getByRole('button',{name:'Reservas',exact:true}).click();
  const card=page.locator('.booking-admin-card').filter({hasText:'Cliente WhatsApp QA'});await card.locator('summary').click();await card.getByRole('button',{name:'Notificar por WhatsApp',exact:true}).click();
  await expect(page.locator('#whatsapp-open')).not.toHaveAttribute('href');await page.locator('#whatsapp-close').click();
  await card.getByLabel('Estado',{exact:true}).selectOption('confirmed');await card.getByLabel('Teléfono del cliente').fill('+591 70012345');await card.getByLabel('Observaciones para el cliente').fill('Trae el diseño de referencia.');await card.getByLabel('Nota interna').fill('SECRET_INTERNAL_ONLY');
  await card.getByRole('button',{name:'Notificar por WhatsApp',exact:true}).click();await expect(page.locator('#whatsapp-dialog')).not.toBeVisible();await expect(page.locator('#admin-message')).toContainText('Guarda los cambios');
  await card.getByRole('button',{name:'Guardar reserva'}).click();await expect(page.locator('#admin-message')).toContainText('Reserva actualizada');
  const saved=(await(await request.get('/api/admin/bookings')).json()).find(row=>row.id===booking.reference);expect(saved.client_note).toBe('Trae el diseño de referencia.');expect(saved.admin_note).toBe('SECRET_INTERNAL_ONLY');expect(saved.phone).toBe('+591 70012345');
  await card.getByRole('button',{name:'Notificar por WhatsApp',exact:true}).click();await expect(page.locator('#whatsapp-dialog')).toBeVisible();
  const message=await page.locator('#whatsapp-message').inputValue();expect(message).toContain('Tu cita está confirmada');expect(message).toContain('Trae el diseño de referencia.');expect(message).not.toContain('SECRET_INTERNAL_ONLY');
  await page.locator('#whatsapp-message').fill(message+'\nPuedes responder a este mensaje.');const href=await page.locator('#whatsapp-open').getAttribute('href');expect(new URL(href).searchParams.get('text')).toContain('Puedes responder');
  // Intercept the destination: no real WhatsApp connection or message is made in QA.
  await page.context().route('https://wa.me/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<p>Destino simulado de WhatsApp</p>'}));
  const popup=page.waitForEvent('popup');await page.getByRole('link',{name:'Abrir WhatsApp'}).click();const window=await popup;await window.waitForLoadState();expect(window.url()).toBe(href);await window.close();
  await page.setViewportSize({width:390,height:844});await page.locator('#whatsapp-dialog').screenshot({path:'test-results/whatsapp-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#whatsapp-close').click();
  await request.put(`/api/admin/bookings/${booking.reference}`,{headers,data:{status:'cancelled'}});
  const changed=(await(await request.get('/api/admin/bookings')).json()).find(row=>row.id===booking.reference);expect(changed.client_note).toBe(saved.client_note);expect(changed.admin_note).toBe(saved.admin_note);
 }finally{await request.delete(`/api/admin/bookings/${booking.reference}`,{headers});await anon.dispose();}
});

test('existing bookings retain their internal notes when the client observation field is added',()=>{
 const directory=mkdtempSync(join(tmpdir(),'inkforma-test-booking-migration-'));
 try{
  const code=`import {DatabaseSync} from 'node:sqlite';import {join} from 'node:path';const old=new DatabaseSync(join(process.env.APP_DATA_DIR,'inkforma.sqlite'));old.exec("CREATE TABLE bookings(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,phone TEXT NOT NULL,day TEXT NOT NULL,time TEXT NOT NULL,zone TEXT NOT NULL,idea TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',admin_note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);INSERT INTO bookings(id,name,email,phone,day,time,zone,idea,admin_note) VALUES('legacy','Cliente QA','qa@example.test','70012345','2026-11-03','15:00','Brazo','Idea previa','NOTA_INTERNA_PREVIA')");old.close();const {db}=await import('./server/db.js');const row=db.prepare('SELECT * FROM bookings WHERE id=?').get('legacy');if(row.admin_note!=='NOTA_INTERNA_PREVIA'||row.client_note!==''||row.phone!=='70012345'||row.status!=='pending')process.exit(1);db.close();`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:process.cwd(),env:{...process.env,APP_DATA_DIR:directory},encoding:'utf8'});expect(result.status,result.stderr).toBe(0);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
