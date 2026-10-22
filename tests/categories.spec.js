import { test,expect } from '@playwright/test';
import sharp from 'sharp';
import { spawnSync } from 'node:child_process';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const headers={Origin:'http://127.0.0.1:5195'};
async function login(request){expect((await request.post('/api/auth/login',{headers,data:{email:'admin@example.test',password:'Only-for-tests-42!'}})).status()).toBe(200);}
async function image(request,category,id,published=true){const buffer=await sharp({create:{width:240,height:300,channels:4,background:{r:70+id*20,g:100,b:75,alpha:1}}}).png().toBuffer();const response=await request.post('/api/admin/gallery',{headers,multipart:{title:`Trabajo carrusel QA ${id}`,description:`Descripción ${id}`,category_id:category,sort_order:String(id),published:String(published),image:{name:'work.png',mimeType:'image/png',buffer}}});expect(response.status()).toBe(201);return response.json();}

test('categories require admin, reject duplicates, rename attached photos and delete without removing media',async({request,playwright})=>{
 const anon=await playwright.request.newContext({baseURL:'http://127.0.0.1:5195'});let category,work;
 try{
  for(const method of ['get','post'])expect((await anon[method]('/api/admin/categories',{headers,data:method==='post'?{name:'No autorizado'}:undefined})).status()).toBe(401);
  await login(request);expect((await request.post('/api/admin/categories',{headers:{Origin:'https://otro.example'},data:{name:'No autorizado'}})).status()).toBe(403);
  category=await(await request.post('/api/admin/categories',{headers,data:{name:'Realismo gestión QA'}})).json();expect(category.id).toBeTruthy();expect((await request.post('/api/admin/categories',{headers,data:{name:'REALISMO GESTIÓN QA'}})).status()).toBe(409);
  work=await image(request,category.id,0);const invalid=await request.put(`/api/admin/gallery/${work.id}`,{headers,data:{title:work.title,category_id:'missing',published:true}});expect(invalid.status()).toBe(400);
  expect((await request.put(`/api/admin/categories/${category.id}`,{headers,data:{name:'Realismo renovado QA'}})).status()).toBe(200);
  let row=(await(await anon.get('/api/gallery')).json()).find(row=>row.id===work.id);expect(row.category).toBe('Realismo renovado QA');expect(row.category_id).toBe(category.id);
  await request.put(`/api/admin/gallery/${work.id}`,{headers,data:{title:work.title,published:true}});row=(await(await anon.get('/api/gallery')).json()).find(row=>row.id===work.id);expect(row.category_id).toBe(category.id);
  expect((await request.delete(`/api/admin/categories/${category.id}`,{headers})).status()).toBe(200);row=(await(await anon.get('/api/gallery')).json()).find(row=>row.id===work.id);expect(row.category_id).toBeNull();expect(row.category).toBe('');expect((await anon.get(row.url)).status()).toBe(200);
 }finally{if(work)await request.delete(`/api/admin/gallery/${work.id}`,{headers});if(category)await request.delete(`/api/admin/categories/${category.id}`,{headers});await anon.dispose();}
});

test('administrator creates and renames a category and selects it when uploading a photo',async({page,request})=>{
 await login(request);await page.context().addCookies((await request.storageState()).cookies);await page.goto('/admin');await page.getByRole('button',{name:'Galería',exact:true}).click();await page.getByLabel('Nueva categoría',{exact:true}).fill('Botánica panel QA');await page.getByRole('button',{name:'Crear categoría',exact:true}).click();await expect(page.locator('#admin-message')).toContainText('Categoría creada');
 const categories=await(await request.get('/api/admin/categories')).json(),category=categories.find(row=>row.name==='Botánica panel QA');let work;
 try{
  const form=page.locator(`.category-edit[data-category="${category.id}"]`);await form.getByLabel('Nombre de categoría').fill('Botánica nueva QA');await form.getByRole('button',{name:'Guardar nombre'}).click();await expect(page.locator('#admin-message')).toContainText('Categoría actualizada');
  await page.getByLabel('Categoría del tatuaje').selectOption({label:'Botánica nueva QA'});await page.getByLabel('Título',{exact:true}).fill('Imagen categorizada QA');const buffer=await sharp({create:{width:40,height:50,channels:4,background:'#456a42'}}).png().toBuffer();await page.locator('input[name=image]').setInputFiles({name:'work.png',mimeType:'image/png',buffer});await page.getByLabel('Publicar en la galería',{exact:true}).check();await page.getByRole('button',{name:'Subir imagen',exact:true}).click();await expect(page.locator('#admin-message')).toContainText('Trabajo guardado');
  work=(await(await request.get('/api/admin/gallery')).json()).find(row=>row.title==='Imagen categorizada QA');expect(work.category_id).toBe(category.id);await page.goto('/');await page.locator('#gallery-filters').getByRole('button',{name:'Botánica nueva QA',exact:true}).click();await expect(page.locator('#gallery-grid')).toContainText(work.title);
 }finally{if(work)await request.delete(`/api/admin/gallery/${work.id}`,{headers});await request.delete(`/api/admin/categories/${category.id}`,{headers});}
});

test('public carousel filters, moves with arrows, browses a lightbox and swipes on mobile',async({page,request,browser})=>{
 await login(request);const category=await(await request.post('/api/admin/categories',{headers,data:{name:'Carrusel QA'}})).json(),other=await(await request.post('/api/admin/categories',{headers,data:{name:'Otro estilo QA'}})).json(),rows=[];let context;
 try{
  for(let i=0;i<5;i++)rows.push(await image(request,i===4?other.id:category.id,i));rows.push(await image(request,category.id,5,false));
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.locator('#gallery-filters').getByRole('button',{name:'Carrusel QA',exact:true}).click();await expect(page.locator('#gallery-grid .gallery-card')).toHaveCount(4);await expect(page.locator('#gallery-grid')).not.toContainText('Trabajo carrusel QA 5');
  await page.locator('#gallery-next').click();await expect.poll(()=>page.locator('#gallery-grid').evaluate(grid=>grid.scrollLeft)).toBeGreaterThan(30);
  await page.locator('#gallery-grid').focus();await page.keyboard.press('ArrowLeft');await expect.poll(()=>page.locator('#gallery-grid').evaluate(grid=>grid.scrollLeft)).toBeLessThan(5);
  await page.getByRole('button',{name:'Ver Trabajo carrusel QA 0',exact:true}).click();await expect(page.locator('#gallery-caption')).toHaveText('Trabajo carrusel QA 0');await page.getByRole('button',{name:'Imagen siguiente',exact:true}).click();await expect(page.locator('#gallery-caption')).toHaveText('Trabajo carrusel QA 1');await page.keyboard.press('ArrowLeft');await expect(page.locator('#gallery-caption')).toHaveText('Trabajo carrusel QA 0');await page.keyboard.press('Escape');await expect(page.locator('#gallery-dialog')).toBeHidden();
  await page.locator('#gallery-filters').getByRole('button',{name:'Otro estilo QA',exact:true}).click();await expect(page.locator('#gallery-grid .gallery-card')).toHaveCount(1);await expect(page.locator('#gallery-next')).toBeDisabled();
  context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const mobile=await context.newPage();await mobile.goto('/');await mobile.locator('#gallery-filters').getByRole('button',{name:'Carrusel QA',exact:true}).click();await mobile.locator('#gallery-grid').scrollIntoViewIfNeeded();const box=await mobile.locator('#gallery-grid').boundingBox(),client=await context.newCDPSession(mobile),y=box.y+100;
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.8,y}]});for(let i=1;i<=8;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*(.8-i*.07),y}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(()=>mobile.locator('#gallery-grid').evaluate(grid=>grid.scrollLeft)).toBeGreaterThan(30);expect(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await mobile.locator('#galeria').screenshot({path:'test-results/gallery-carousel-mobile.png'});
 }finally{await context?.close();for(const row of rows)await request.delete(`/api/admin/gallery/${row.id}`,{headers});await request.delete(`/api/admin/categories/${category.id}`,{headers});await request.delete(`/api/admin/categories/${other.id}`,{headers});}
});

test('migration groups old free-text categories without losing photos',()=>{
 const directory=mkdtempSync(join(tmpdir(),'inkforma-test-category-migration-'));
 try{const code=`import {DatabaseSync} from 'node:sqlite';import {join} from 'node:path';const old=new DatabaseSync(join(process.env.APP_DATA_DIR,'inkforma.sqlite'));old.exec("CREATE TABLE gallery(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',category TEXT NOT NULL DEFAULT '',filename TEXT NOT NULL UNIQUE,published INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);INSERT INTO gallery(id,title,filename,published,category) VALUES('one','Foto previa','one.webp',1,'Bótanica'),('two','Otra foto','two.webp',0,'botanica')");old.close();const {db}=await import('./server/db.js');const rows=db.prepare('SELECT * FROM gallery ORDER BY id').all();if(rows.length!==2||!rows[0].category_id||rows[0].category_id!==rows[1].category_id||rows[0].published!==1||rows[1].filename!=='two.webp')process.exit(1);db.close();`;const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:process.cwd(),env:{...process.env,APP_DATA_DIR:directory},encoding:'utf8'});expect(result.status,result.stderr).toBe(0);}finally{rmSync(directory,{recursive:true,force:true});}
});
