import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

export const dataDir=resolve(process.env.APP_DATA_DIR || 'data');
export const mediaDir=join(dataDir,'media');
mkdirSync(mediaDir,{recursive:true,mode:0o700});
export const db=new DatabaseSync(join(dataDir,'inkforma.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS admins(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),content TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gallery(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',category TEXT NOT NULL DEFAULT '',filename TEXT NOT NULL UNIQUE,published INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,phone TEXT NOT NULL,day TEXT NOT NULL,time TEXT NOT NULL,zone TEXT NOT NULL,idea TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled','completed')),admin_note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot ON bookings(day,time) WHERE status IN ('pending','confirmed');
CREATE TABLE IF NOT EXISTS body_models(id TEXT PRIMARY KEY,title TEXT NOT NULL,filename TEXT NOT NULL UNIQUE,published INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
`);
// Additive migration: existing photos, reservations and accounts remain intact.
const galleryColumns=new Set(db.prepare('PRAGMA table_info(gallery)').all().map(column=>column.name));
if(!galleryColumns.has('kind'))db.exec("ALTER TABLE gallery ADD COLUMN kind TEXT NOT NULL DEFAULT 'work'");
if(!galleryColumns.has('design_filename'))db.exec('ALTER TABLE gallery ADD COLUMN design_filename TEXT');
db.exec('PRAGMA user_version=2');
export const defaults={
 brandName:'INKFORMA',tagline:'TATTOO STUDIO',heroLine1:'Tu piel.',heroLine2:'Tu historia.',heroAccent:'Tu próxima tinta.',heroIntro:'Un espacio para imaginar lo que llevarás contigo. Explora tu próximo tatuaje antes de dar el paso.',
 aboutTitle:'Arte con identidad.',aboutText:'Cada tatuaje empieza con una conversación. Creamos piezas que conectan con tu historia, cuidando el diseño, la técnica y cada detalle de tu experiencia.',
 galleryTitle:'Historias sobre la piel.',galleryIntro:'Una selección de trabajos e inspiración del estudio.',
 contactTitle:'Una idea hoy. Una historia para siempre.',contactText:'Trae tu inspiración. Hagamos espacio para tu próxima pieza.',contactEmail:'',contactPhone:'',address:'',instagram:'',
 footerText:'Arte, piel e identidad.',timezone:'America/La_Paz',bookingNotice:'La solicitud queda pendiente de confirmación. El estudio se pondrá en contacto contigo; no se cobra ningún anticipo desde esta página.',
 bookingDays:[2,3,4,5,6],openTime:'10:00',closeTime:'18:00',slotMinutes:60,
};
db.prepare('INSERT OR IGNORE INTO settings(id,content) VALUES(1,?)').run(JSON.stringify(defaults));
export function getSettings(){return {...defaults,...JSON.parse(db.prepare('SELECT content FROM settings WHERE id=1').get().content)};}
