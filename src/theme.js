import './theme.css';
const key='inkforma-theme';
const valid=value=>value==='future'||value==='classic';
export function setTheme(theme,{save=true}={}){
 if(!valid(theme))theme='classic';document.documentElement.dataset.theme=theme;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='future'?'#080e1c':'#f8f7f3');
 if(save)try{localStorage.setItem(key,theme);}catch{/* The switch still works when browser storage is unavailable. */}
 for(const button of document.querySelectorAll('.theme-toggle')){
  button.setAttribute('aria-pressed',String(theme==='future'));button.setAttribute('aria-label',theme==='future'?'Activar tema clásico':'Activar tema futurista');button.title=theme==='future'?'Cambiar al tema clásico':'Cambiar al tema futurista';button.querySelector('span').textContent=theme==='future'?'Futurista':'Clásico';
 }
}
export function createThemeToggle(){
 const button=document.createElement('button');button.type='button';button.className='theme-toggle';button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/><path d="M19 3v4m-2-2h4"/></svg><span></span>';
 button.onclick=()=>setTheme(document.documentElement.dataset.theme==='future'?'classic':'future');
 const theme=document.documentElement.dataset.theme==='future'?'future':'classic';button.setAttribute('aria-pressed',String(theme==='future'));button.setAttribute('aria-label',theme==='future'?'Activar tema clásico':'Activar tema futurista');button.title=theme==='future'?'Cambiar al tema clásico':'Cambiar al tema futurista';button.querySelector('span').textContent=theme==='future'?'Futurista':'Clásico';return button;
}
setTheme(document.documentElement.dataset.theme,{save:false});
window.addEventListener('storage',event=>{if(event.key===key||event.key===null)setTheme(event.newValue,{save:false});});
