export async function api(path,{method='GET',body,...options}={}){
 const response=await fetch(path,{method,credentials:'same-origin',...options,headers:{...(body instanceof FormData?{}:body?{'Content-Type':'application/json'}:{}),...options.headers},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
 let result;try{result=await response.json();}catch{throw Error('No se pudo contactar con el estudio. Recarga la página e inténtalo de nuevo.');}
 if(!response.ok){const error=new Error(result.error||'No se pudo completar la operación.');error.status=response.status;throw error;}return result;
}
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function notify(element,message,error=false){element.textContent=message;element.classList.toggle('is-error',error);element.classList.toggle('is-success',!error&&!!message);}
