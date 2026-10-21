import { test, expect } from '@playwright/test';

async function openStudio(page){
 await page.goto('/');
 await expect(page.locator('#canvas')).toHaveAttribute('data-model-state','ready');
}
async function uploadTattoo(page){
 const data=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,100,100);
  ctx.fillStyle='#111';ctx.fillRect(25,15,15,70);ctx.fillRect(25,70,50,15);
  return canvas.toDataURL().split(',')[1];
 });
 await page.locator('#upload').setInputFiles({name:'tattoo.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
 await expect(page.locator('#mode-move')).toHaveAttribute('aria-pressed','true');
}
async function skinPoints(page){
 await page.locator('#canvas canvas').scrollIntoViewIfNeeded();
 const box=await page.locator('#canvas canvas').boundingBox();
 return {start:{x:box.x+box.width*.5,y:box.y+box.height*.39},end:{x:box.x+box.width*.51,y:box.y+box.height*.50}};
}
async function savePlacement(page){
 await page.locator('#save').click();
 return page.evaluate(()=>JSON.parse(localStorage.getItem('inkforma-library'))[0].placement);
}
test('anatomical models load for both sexes and all body builds',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await openStudio(page);
 for(const [sex,model] of [['masculino','male'],['femenino','female']]){
  await page.locator('#sex').selectOption(sex);
  for(const build of ['delgada','media','robusta']){
   await page.locator('#build').selectOption(build);
   await expect(page.locator('#canvas')).toHaveAttribute('data-body-model',`${model}-${build}`);
   await expect(page.locator('#canvas')).toHaveAttribute('data-model-state','ready');
  }
 }
 await page.screenshot({path:'test-results/anatomy-desktop.png',fullPage:true});
 expect(errors).toEqual([]);
});
test('drag tattoo on skin, orbit independently, restore placement and export',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await openStudio(page);await uploadTattoo(page);
 const pixels=await page.locator('#design-preview canvas').evaluate(c=>({background:c.getContext('2d').getImageData(0,0,1,1).data[3],ink:c.getContext('2d').getImageData(30,30,1,1).data[3]}));
 expect(pixels).toEqual({background:0,ink:255});
 let {start,end}=await skinPoints(page);
 await page.mouse.click(start.x,start.y);const initial=await savePlacement(page);expect(initial).not.toBeNull();
 ({start,end}=await skinPoints(page));await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:10});await page.mouse.up();
 const moved=await savePlacement(page);expect(moved.point).not.toEqual(initial.point);
 await page.locator('#rotation').fill('38');await page.locator('#rotation').dispatchEvent('input');
 await page.locator('#opacity').fill('0.65');await page.locator('#opacity').dispatchEvent('input');
 await page.locator('#flip').click();const adjusted=await savePlacement(page);expect(adjusted).toMatchObject({rotation:38,opacity:.65,flipped:true});
 await page.locator('#mode-orbit').click();({start,end}=await skinPoints(page));
 const before=await page.locator('#canvas canvas').screenshot();
 await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+110,start.y,{steps:10});await page.mouse.up();
 const after=await page.locator('#canvas canvas').screenshot();expect(before.equals(after)).toBe(false);
 const afterOrbit=await savePlacement(page);expect(afterOrbit).toEqual(adjusted);
 await page.reload();await expect(page.locator('#canvas')).toHaveAttribute('data-model-state','ready');
 await page.locator('.design-card').first().getByRole('button',{name:'Usar',exact:true}).click();
 await expect(page.locator('#rotation')).toHaveValue('38');await expect(page.locator('#opacity')).toHaveValue('0.65');
 const restored=await savePlacement(page);expect({...restored,normal:undefined}).toEqual({...adjusted,normal:undefined});restored.normal.forEach((n,i)=>expect(n).toBeCloseTo(adjusted.normal[i],10));
 const downloaded=page.waitForEvent('download');await page.locator('#export').click();expect((await downloaded).suggestedFilename()).toBe('inkforma-vista.png');
 await page.locator('#clear').click();expect(await savePlacement(page)).toBeNull();
 expect(errors).toEqual([]);
});
test('touch dragging moves ink without scrolling; mobile layout fits',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();await openStudio(page);await uploadTattoo(page);
 let {start,end}=await skinPoints(page);await page.touchscreen.tap(start.x,start.y);const initial=await savePlacement(page);expect(initial).not.toBeNull();
 ({start,end}=await skinPoints(page));const client=await context.newCDPSession(page);const scroll=await page.evaluate(()=>scrollY);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x,y:start.y}]});
 for(let i=1;i<=8;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/8,y:start.y+(end.y-start.y)*i/8}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 expect(await page.evaluate(()=>scrollY)).toBe(scroll);
 const moved=await savePlacement(page);expect(moved.point).not.toEqual(initial.point);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/anatomy-mobile.png',fullPage:true});await context.close();
});
test('failed model load shows recovery and retry succeeds',async({page})=>{
 await page.route('**/models/male.glb',route=>route.abort());await page.goto('/');
 await expect(page.locator('#canvas')).toHaveAttribute('data-model-state','error');await expect(page.locator('#status')).toContainText('No se pudo cargar');
 await page.unroute('**/models/male.glb');await page.locator('#build').selectOption('delgada');
 await expect(page.locator('#canvas')).toHaveAttribute('data-model-state','ready');
});
