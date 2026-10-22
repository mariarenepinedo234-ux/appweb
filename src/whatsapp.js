// Compose locally from an explicit allowlist. Internal notes never enter the message.
export function whatsappNumber(value){
 if(typeof value!=='string'||!/^(?:\+|00)[\d\s().-]+$/.test(value.trim()))return null;
 const number=value.trim().replace(/^00/,'+').replace(/[\s().-]/g,'').slice(1);
 return /^[1-9]\d{7,14}$/.test(number)?number:null;
}
export function bookingMessage(booking,site){
 const date=/^\d{4}-\d{2}-\d{2}$/.test(booking.day)?booking.day.split('-').reverse().join('/'):booking.day;
 const when=`${date} a las ${booking.time} (hora del estudio)`;
 const messages={pending:`Recibimos tu solicitud para el ${when}. Está pendiente de confirmación; todavía no es una cita confirmada.`,confirmed:`Tu cita está confirmada para el ${when}.`,cancelled:`Tu reserva para el ${when} ha sido cancelada. Contáctanos si quieres consultar otra fecha.`,completed:`Gracias por visitar el estudio. Tu cita del ${when} figura como completada. Si tienes dudas sobre los cuidados, escríbenos.`};
 if(!Object.hasOwn(messages,booking.status))throw Error('Estado de reserva no válido.');
 return [`Hola, ${booking.name}. Te escribimos de ${site.brandName}.`,messages[booking.status],booking.client_note?`Observaciones para ti: ${booking.client_note}`:'',`Referencia: ${booking.id.slice(0,8).toUpperCase()}.`].filter(Boolean).join('\n\n');
}
export function whatsappLink(phone,message){const number=whatsappNumber(phone);if(!number||!message.trim())return null;return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;}
