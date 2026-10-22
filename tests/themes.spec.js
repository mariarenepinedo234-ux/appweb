import {test,expect} from '@playwright/test';

test('theme toggle remembers the visitor choice through reload, login and administration',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-theme','classic');
 await page.getByRole('button',{name:'Activar tema futurista'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','future');expect(await page.evaluate(()=>localStorage.getItem('inkforma-theme'))).toBe('future');await expect(page.locator('.theme-toggle')).toHaveAttribute('aria-pressed','true');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','future');await page.getByRole('link',{name:'Administración',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','future');
 await page.getByLabel('Correo electrónico',{exact:true}).fill('admin@example.test');await page.getByLabel('Contraseña',{exact:true}).fill('Only-for-tests-42!');await page.getByRole('button',{name:'Entrar al panel'}).click();await expect(page.getByRole('heading',{name:'Tu estudio, en un vistazo.'})).toBeVisible();await page.getByRole('button',{name:'Galería',exact:true}).click();
 await page.getByRole('button',{name:'Activar tema clásico'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','classic');await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await expect(page.getByRole('button',{name:'Activar tema futurista'})).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-theme','classic');expect(errors).toEqual([]);
});

test('mobile theme control is keyboard accessible and does not cover administration or overflow',async({page})=>{
 await page.setViewportSize({width:320,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.getByRole('button',{name:'Activar tema futurista'}).focus();await page.keyboard.press('Enter');await expect(page.locator('html')).toHaveAttribute('data-theme','future');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});const layout=await page.evaluate(()=>{const button=document.querySelector('.header-actions .theme-toggle').getBoundingClientRect(),admin=document.querySelector('.header-actions .admin-link').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,overlap:button.left<admin.right&&button.right>admin.left&&button.top<admin.bottom&&button.bottom>admin.top};});expect(layout).toEqual({overflow:false,overlap:false});}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/future-mobile.png'});await page.getByRole('button',{name:'Pregúntale a la IA'}).click();await expect(page.locator('#chat-panel')).toBeVisible();await page.getByRole('button',{name:'Cerrar chat',exact:true}).click();
});

test('blocked browser storage keeps the theme switch usable without crashing',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage blocked','SecurityError');}}));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('html')).toHaveAttribute('data-theme','classic');await page.getByRole('button',{name:'Activar tema futurista'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','future');await page.getByRole('button',{name:'Activar tema clásico'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','classic');expect(errors).toEqual([]);
});
