export function text(value,name,max=200,min=0){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw Error(`${name}: se requieren entre ${min} y ${max} caracteres.`);return value.trim();}
export function email(value){const result=text(value,'Correo',254,3).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))throw Error('Escribe un correo válido.');return result;}
export function bool(value){return value===true||value==='true'||value==='1';}
export function validateSettings(input,current){
 const result={...current};
 const limits={brandName:50,tagline:80,heroLine1:80,heroLine2:80,heroAccent:100,heroIntro:500,aboutTitle:100,aboutText:3000,galleryTitle:100,galleryIntro:1000,contactTitle:150,contactText:1500,contactEmail:254,contactPhone:50,address:300,instagram:300,footerText:200,bookingNotice:1500,timezone:80};
 for(const [key,max] of Object.entries(limits))if(key in input)result[key]=text(input[key],key,max,['brandName','heroLine1','contactTitle'].includes(key)?1:0);
 if(result.contactEmail)email(result.contactEmail);
 if(result.instagram){const url=new URL(result.instagram);if(url.protocol!=='https:')throw Error('El enlace de Instagram debe empezar con https://');}
 try{new Intl.DateTimeFormat('es',{timeZone:result.timezone}).format();}catch{throw Error('Zona horaria no válida.');}
 if('bookingDays' in input){if(!Array.isArray(input.bookingDays)||input.bookingDays.length===0||input.bookingDays.some(x=>!Number.isInteger(x)||x<0||x>6))throw Error('Selecciona al menos un día de atención.');result.bookingDays=[...new Set(input.bookingDays)];}
 for(const key of ['openTime','closeTime'])if(key in input){if(typeof input[key]!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input[key]))throw Error('Horario no válido.');result[key]=input[key];}
 if('slotMinutes' in input){if(![30,60,90,120].includes(input.slotMinutes))throw Error('Duración no válida.');result.slotMinutes=input.slotMinutes;}
 if(minutes(result.closeTime)-minutes(result.openTime)<result.slotMinutes)throw Error('El cierre debe ser posterior a la apertura y permitir al menos un turno.');return result;
}
export function minutes(time){const [h,m]=time.split(':').map(Number);return h*60+m;}
export function clock(value){return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;}
export function studioNow(timezone){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return {day:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};}
export function validateDay(day,settings){
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Fecha no válida.');const date=new Date(day+'T12:00:00Z');if(Number.isNaN(date.valueOf())||date.toISOString().slice(0,10)!==day)throw Error('Fecha no válida.');
 const now=studioNow(settings.timezone);if(day<now.day||date.valueOf()-new Date(now.day+'T12:00:00Z').valueOf()>180*86400000)throw Error('Elige una fecha dentro de los próximos 180 días.');return date;
}
export function scheduledTimes(day,settings){const date=validateDay(day,settings);if(!settings.bookingDays.includes(date.getUTCDay()))return [];const now=studioNow(settings.timezone),times=[];for(let at=minutes(settings.openTime);at+settings.slotMinutes<=minutes(settings.closeTime);at+=settings.slotMinutes){const time=clock(at);if(day>now.day||time>now.time)times.push(time);}return times;}
export function validateGlb(buffer){
 if(buffer.length<28||buffer.readUInt32LE(0)!==0x46546c67||buffer.readUInt32LE(4)!==2||buffer.readUInt32LE(8)!==buffer.length||buffer.readUInt32LE(16)!==0x4e4f534a)throw Error('El archivo debe ser un GLB 2.0 válido.');
 const length=buffer.readUInt32LE(12);if(length>buffer.length-20)throw Error('GLB incompleto.');let data;try{data=JSON.parse(buffer.subarray(20,20+length).toString());}catch{throw Error('El GLB contiene datos JSON no válidos.');}
 if(!data.meshes?.length||!data.scenes?.length||!data.buffers?.length)throw Error('El GLB debe contener una escena con mallas.');
 if(data.skins?.length||data.animations?.length)throw Error('Exporta una malla estática, sin esqueleto ni animaciones.');
 if([...(data.buffers||[]),...(data.images||[])].some(x=>x.uri))throw Error('Incluye todas las texturas y datos dentro del archivo GLB.');
 if(data.extensionsRequired?.some(x=>['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'].includes(x)))throw Error('Exporta sin compresión Draco, Meshopt ni texturas KTX2.');
 if(data.meshes.some(m=>m.primitives?.some(p=>p.mode!==undefined&&p.mode!==4)))throw Error('Exporta las mallas como triángulos.');
 let triangles=0;for(const mesh of data.meshes)for(const p of mesh.primitives||[]){const a=data.accessors?.[p.indices??p.attributes?.POSITION];if(!a||!Number.isFinite(a.count))throw Error('La geometría del modelo no es válida.');triangles+=a.count/3;}
 if(triangles>500000)throw Error('Reduce el modelo a un máximo de 500.000 triángulos.');return data;
}
