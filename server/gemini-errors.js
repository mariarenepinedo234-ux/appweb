// Only fixed messages are exposed; never return Google's raw errors or credentials.
export function geminiError(status,data={}){
 const reasons=(data?.error?.details||[]).map(item=>item?.reason);
 if(reasons.some(reason=>['API_KEY_INVALID','API_KEY_EXPIRED'].includes(reason))||status===401)return 'Gemini rechazó la clave API. Crea o revisa tu clave de Google AI Studio y ejecuta npm.cmd run ai:configure.';
 if(status===403)return 'Gemini denegó el acceso. Revisa en Google AI Studio los permisos y restricciones de la clave, y que la API esté habilitada para tu proyecto y región.';
 if(status===404)return 'Google devolvió HTTP 404 al generar con el modelo configurado. Esto no confirma que la clave sea inválida. Comprueba el modelo en Administración → Asistente IA y ejecuta npm.cmd run ai:check -- --generate.';
 if(status===429)return 'Gemini alcanzó su cuota disponible. Revisa los límites de tu proyecto en Google AI Studio; puede que no tenga cuota gratuita para este modelo. No es necesario activar pagos para diagnosticarlo.';
 if(status===400)return 'Gemini rechazó la solicitud. Revisa la clave y la disponibilidad del servicio para tu proyecto y región con npm.cmd run ai:check.';
 if(status>=500)return 'Gemini está temporalmente fuera de servicio. Inténtalo más tarde.';
 return 'El servicio de IA no pudo responder. Ejecuta npm.cmd run ai:check en el servidor para comprobar la conexión.';
}
