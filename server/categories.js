import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { requireAdmin } from './auth.js';
import { categoryKey } from './category-name.js';
function fail(message,status=400){const error=new Error(message);error.status=status;throw error;}
function nameOf(value){if(typeof value!=='string')fail('Escribe el nombre de la categoría.');const name=value.trim().replace(/\s+/g,' ');if(!name||name.length>60)fail('El nombre de categoría debe tener entre 1 y 60 caracteres.');return name;}
export function resolveCategory(body,old={},kind='work'){
 if(kind!=='work')return {id:null,name:''};
 if(Object.hasOwn(body,'category_id')){if(body.category_id===null||body.category_id==='')return {id:null,name:''};if(typeof body.category_id!=='string')fail('Selecciona una categoría válida.');const category=db.prepare('SELECT * FROM gallery_categories WHERE id=?').get(body.category_id);if(!category)fail('La categoría ya no existe. Recarga el panel y selecciona otra.');return category;}
 // Compatibility with older administrator clients; the new form uses category_id.
 if(Object.hasOwn(body,'category')){if(body.category==='')return {id:null,name:''};const name=nameOf(body.category),key=categoryKey(name);let category=db.prepare('SELECT * FROM gallery_categories WHERE name_key=?').get(key);if(!category){const id=randomUUID();db.prepare('INSERT INTO gallery_categories(id,name,name_key) VALUES(?,?,?)').run(id,name,key);category={id,name};}return category;}
 return old.category_id?db.prepare('SELECT * FROM gallery_categories WHERE id=?').get(old.category_id)||{id:null,name:''}:{id:null,name:''};
}
export function installCategories(app){
 app.get('/api/admin/categories',requireAdmin,(req,res)=>res.json(db.prepare("SELECT c.id,c.name,COUNT(g.id) AS imageCount FROM gallery_categories c LEFT JOIN gallery g ON g.category_id=c.id AND g.kind='work' GROUP BY c.id ORDER BY c.name COLLATE NOCASE").all()));
 app.post('/api/admin/categories',requireAdmin,(req,res,next)=>{try{const name=nameOf(req.body?.name),key=categoryKey(name);if(db.prepare('SELECT id FROM gallery_categories WHERE name_key=?').get(key))fail('Ya existe una categoría con ese nombre.',409);const id=randomUUID();db.prepare('INSERT INTO gallery_categories(id,name,name_key) VALUES(?,?,?)').run(id,name,key);res.status(201).json({id,name,imageCount:0});}catch(error){next(error);}});
 app.put('/api/admin/categories/:id',requireAdmin,(req,res,next)=>{try{
  const old=db.prepare('SELECT * FROM gallery_categories WHERE id=?').get(req.params.id);if(!old)fail('La categoría no existe.',404);const name=nameOf(req.body?.name),key=categoryKey(name);if(db.prepare('SELECT id FROM gallery_categories WHERE name_key=? AND id<>?').get(key,old.id))fail('Ya existe una categoría con ese nombre.',409);
  db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE gallery_categories SET name=?,name_key=? WHERE id=?').run(name,key,old.id);db.prepare('UPDATE gallery SET category=? WHERE category_id=?').run(name,old.id);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}res.json({id:old.id,name});
 }catch(error){next(error);}});
 app.delete('/api/admin/categories/:id',requireAdmin,(req,res,next)=>{try{if(!db.prepare('SELECT id FROM gallery_categories WHERE id=?').get(req.params.id))fail('La categoría no existe.',404);db.exec('BEGIN IMMEDIATE');try{db.prepare("UPDATE gallery SET category='',category_id=NULL WHERE category_id=?").run(req.params.id);db.prepare('DELETE FROM gallery_categories WHERE id=?').run(req.params.id);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}res.json({ok:true});}catch(error){next(error);}});
}
