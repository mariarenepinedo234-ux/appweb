import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import { db } from './db.js';
export function hashPassword(password){const salt=randomBytes(16).toString('hex');return `scrypt$${salt}$${scryptSync(password,salt,64).toString('hex')}`;}
export function verifyPassword(password,encoded){try{const [,salt,hash]=encoded.split('$'),actual=scryptSync(password,salt,64),expected=Buffer.from(hash,'hex');return expected.length===actual.length&&timingSafeEqual(expected,actual);}catch{return false;}}
export function createAdmin(email,password){
 email=email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Escribe un correo válido.');
 if(typeof password!=='string'||password.length<12||password.length>128)throw Error('La contraseña debe tener entre 12 y 128 caracteres.');
 db.prepare('INSERT INTO admins(id,email,password_hash) VALUES(?,?,?)').run(randomUUID(),email,hashPassword(password));
}
export const tokenHash=value=>createHash('sha256').update(value).digest('hex');
export function sessionFrom(req){const match=(req.headers.cookie||'').match(/(?:^|;\s*)inkforma_session=([A-Za-z0-9_-]+)/);if(!match)return null;return db.prepare('SELECT admins.id,admins.email FROM sessions JOIN admins ON admins.id=sessions.admin_id WHERE token_hash=? AND expires_at>?').get(tokenHash(match[1]),Date.now()) || null;}
export function requireAdmin(req,res,next){req.admin=sessionFrom(req);if(!req.admin)return res.status(401).json({error:'Inicia sesión como administrador.'});next();}
export function sameOrigin(req,res,next){
 if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
 try{const origin=new URL(req.headers.origin);if(process.env.PUBLIC_ORIGIN?origin.origin!==new URL(process.env.PUBLIC_ORIGIN).origin:origin.host!==req.headers.host||!['http:','https:'].includes(origin.protocol))throw Error();}catch{return res.status(403).json({error:'La solicitud debe proceder de esta aplicación.'});}next();
}
export function setSessionCookie(req,res,value,maxAge=8*60*60*1000){const secure=process.env.PUBLIC_ORIGIN?.startsWith('https://')||req.secure;res.cookie('inkforma_session',value,{httpOnly:true,sameSite:'strict',secure:!!secure,path:'/',maxAge});}
export function newSession(adminId){const token=randomBytes(32).toString('base64url');db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());db.prepare('INSERT INTO sessions(token_hash,admin_id,expires_at) VALUES(?,?,?)').run(tokenHash(token),adminId,Date.now()+8*60*60*1000);return token;}
