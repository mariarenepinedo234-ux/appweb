import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { spawnSync } from 'node:child_process';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const headers={Origin:'http://127.0.0.1:5195'};
async function login(request){expect((await request.post('/api/auth/login',{headers,data:{email:'admin@example.test',password:'Only-for-tests-42!'}})).status()).toBe(200);}
const png=()=>sharp({create:{width:100,height:160,channels:4,background:'#182e21'}}).png().toBuffer();

test('a visitor explores styles, applies a sample to skin and saves its real placement',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await expect(page.locator('#hero-preview canvas')).toBeVisible();
 await expect(page.locator('#hero-preview')).toHaveAttribute('data-tattoo-vertices',/[1-9][0-9]+/);
 await page.getByRole('button',{name:'Pausar giro',exact:true}).click();await expect(page.locator('#hero-motion')).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'Geométrico',exact:true}).click();await expect(page.locator('#style-title')).toHaveText('Encuentra tu equilibrio.');
 await page.getByRole('button',{name:'Probar este diseño ↗',exact:true}).click();
 await expect(page.locator('#canvas')).toHaveAttribute('data-tattoo-type','decal');await expect(page.locator('#status')).toContainText('ya está sobre la piel');
 await page.locator('#save').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('inkforma-library'))[0]);expect(saved.zone).toBe('forearm-left');expect(saved.placement.point).toHaveLength(3);
 await page.locator('#mode-orbit').click();await page.locator('[data-view=back]').click();await expect(page.locator('#canvas')).toHaveAttribute('data-tattoo-type','decal');
 expect(errors).toEqual([]);
});

test('mobile and reduced motion use a lightweight poster with opt-in 3D',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('#hero-preview img')).toBeVisible();await expect(page.locator('#hero-preview canvas')).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Administración',exact:true})).toBeVisible();
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:390,height:844});await page.locator('#hero-load').click();await expect(page.locator('#hero-preview canvas')).toBeVisible();await expect(page.locator('#hero-motion')).toHaveAttribute('aria-pressed','false');
});

test('gallery drawings stay private until publication, survive edits, apply to skin and can be removed',async({page,request,playwright})=>{
 await login(request);const anon=await playwright.request.newContext({baseURL:'http://127.0.0.1:5195'});let id;
 try{
  const response=await request.post('/api/admin/gallery',{headers,multipart:{title:'Pieza con diseño QA',kind:'work',image:{name:'photo.png',mimeType:'image/png',buffer:await png()},design:{name:'drawing.png',mimeType:'image/png',buffer:await png()}}});expect(response.status()).toBe(201);let row=await response.json();id=row.id;const designUrl=row.designUrl;
  expect(designUrl).toBeTruthy();expect((await anon.get(designUrl)).status()).toBe(404);
  const update={title:row.title,description:'Dibujo limpio adjunto',category:'Geométrico',published:true};
  expect((await request.put(`/api/admin/gallery/${id}`,{headers,data:update})).status()).toBe(200);expect((await anon.get(designUrl)).status()).toBe(200);
  await page.goto('/');await page.getByRole('button',{name:'Probar diseño de Pieza con diseño QA',exact:true}).click();await expect(page.locator('#status')).toContainText('ya está sobre la piel');
  const broken=await request.put(`/api/admin/gallery/${id}`,{headers,multipart:{...update,published:'true',design:{name:'fake.png',mimeType:'image/png',buffer:Buffer.from('<svg/>')}}});expect(broken.status()).toBe(400);expect((await anon.get(designUrl)).status()).toBe(200);
  row=await (await request.put(`/api/admin/gallery/${id}`,{headers,data:{...update,removeDesign:true}})).json();expect(row.designUrl).toBeNull();expect((await anon.get(designUrl)).status()).toBe(404);
 }finally{if(id)await request.delete(`/api/admin/gallery/${id}`,{headers});await anon.dispose();}
});

test('administrator publishes real studio and artist photos in their dedicated section',async({page,request})=>{
 await login(request);await page.context().addCookies((await request.storageState()).cookies);await page.goto('/admin');await page.getByRole('button',{name:'Galería',exact:true}).click();
 await page.getByLabel('Título',{exact:true}).fill('Nuestro espacio QA');await page.getByLabel('Tipo de publicación').selectOption('studio');await page.locator('input[name=image]').setInputFiles({name:'studio.png',mimeType:'image/png',buffer:await png()});await page.getByLabel('Publicar en la galería',{exact:true}).check();await page.getByRole('button',{name:'Subir imagen',exact:true}).click();await expect(page.locator('#admin-message')).toContainText('Trabajo guardado');
 const artist=await (await request.post('/api/admin/gallery',{headers,multipart:{title:'Artista QA',description:'Especialidad declarada por el estudio.',kind:'artist',published:'true',image:{name:'artist.png',mimeType:'image/png',buffer:await png()}}})).json();
 try{await page.goto('/');await expect(page.locator('#studio-people')).toBeVisible();await expect(page.locator('#studio-people')).toContainText('Nuestro espacio QA');await expect(page.locator('#studio-people')).toContainText('Artista QA');await expect(page.locator('#gallery-grid')).not.toContainText('Nuestro espacio QA');}
 finally{for(const row of await (await request.get('/api/admin/gallery')).json())if(row.id===artist.id||row.title==='Nuestro espacio QA')await request.delete(`/api/admin/gallery/${row.id}`,{headers});}
});

test('gallery migration preserves old photos while adding optional fields',()=>{
 const directory=mkdtempSync(join(tmpdir(),'inkforma-test-migration-'));
 try{
  const code=`import {DatabaseSync} from 'node:sqlite';import {join} from 'node:path';const old=new DatabaseSync(join(process.env.APP_DATA_DIR,'inkforma.sqlite'));old.exec("CREATE TABLE gallery(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',category TEXT NOT NULL DEFAULT '',filename TEXT NOT NULL UNIQUE,published INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);INSERT INTO gallery(id,title,filename,published) VALUES('legacy','Foto existente','legacy.webp',1)");old.close();const {db}=await import('./server/db.js');const row=db.prepare('SELECT * FROM gallery WHERE id=?').get('legacy');if(row.title!=='Foto existente'||row.kind!=='work'||row.design_filename!==null||row.published!==1)process.exit(1);db.close();`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:process.cwd(),env:{...process.env,APP_DATA_DIR:directory},encoding:'utf8'});expect(result.status,result.stderr).toBe(0);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
