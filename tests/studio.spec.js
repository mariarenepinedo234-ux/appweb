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

async function sampleFrame(page){
 return page.locator('#canvas canvas').evaluate(async canvas=>{
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const copy=document.createElement('canvas');copy.width=320;copy.height=Math.round(320*canvas.height/canvas.width);const ctx=copy.getContext('2d');ctx.drawImage(canvas,0,0,copy.width,copy.height);return Array.from(ctx.getImageData(0,0,copy.width,copy.height).data);
 });
}

test('isolated zones retain bracelet ink on front, back and both sides',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 page.on('console',msg=>{if(msg.type()==='error'&&/shader|THREE.WebGLProgram/.test(msg.text()))errors.push(msg.text());});
 await openStudio(page);await page.locator('#demo-band').click();
 await expect(page.locator('#canvas')).toHaveAttribute('data-tattoo-type','band');
 await expect(page.locator('#zone')).toHaveValue('forearm-left');await expect(page.locator('#canvas')).toHaveAttribute('data-isolated','true');
 await page.locator('#mode-orbit').click();
 for(const view of ['front','back','left','right']){
  await page.locator(`[data-view=${view}]`).click();
  const withInk=await sampleFrame(page);
  await page.locator('#clear').click();const noInk=await sampleFrame(page);
  let changed=0;for(let i=0;i<noInk.length;i+=4)if(Math.abs(noInk[i]-withInk[i])+Math.abs(noInk[i+1]-withInk[i+1])+Math.abs(noInk[i+2]-withInk[i+2])>35)changed++;
  expect(changed,`visible ink on ${view}`).toBeGreaterThan(100);
  await page.locator('#band-position').dispatchEvent('input');
 }
 await page.locator('[data-view=front]').click();await page.locator('.viewport').screenshot({path:'test-results/bracelet-front.png'});
 await page.locator('[data-view=back]').click();await page.locator('.viewport').screenshot({path:'test-results/bracelet-back.png'});
 await page.locator('#isolate').uncheck();await expect(page.locator('#canvas')).toHaveAttribute('data-isolated','false');await expect(page.locator('#canvas')).toHaveAttribute('data-tattoo-type','band');
 await page.locator('#isolate').check();await page.locator('#auto-rotate').click();await expect(page.locator('#auto-rotate')).toHaveAttribute('aria-pressed','true');
 await page.locator('#mode-move').click();await expect(page.locator('#auto-rotate')).toHaveAttribute('aria-pressed','false');
 expect(errors).toEqual([]);
});

test('zone and wrap controls restore from the library',async({page})=>{
 await openStudio(page);await page.locator('#demo-band').click();await expect(page.locator('#canvas')).toHaveAttribute('data-tattoo-type','band');
 await page.locator('#zone').selectOption('forearm-right');
 await page.locator('#band-position').fill('0.67');await page.locator('#band-position').dispatchEvent('input');
 await page.locator('#band-repeat').fill('3');await page.locator('#band-repeat').dispatchEvent('input');
 await page.locator('#size').fill('0.09');await page.locator('#size').dispatchEvent('input');
 const saved=await savePlacement(page);expect(saved).toMatchObject({application:'band',bandPosition:.67,repeats:3,size:.09});
 await page.reload();await expect(page.locator('#canvas')).toHaveAttribute('data-model-state','ready');await page.locator('.design-card').first().getByRole('button',{name:'Usar',exact:true}).click();
 await expect(page.locator('#zone')).toHaveValue('forearm-right');await expect(page.locator('#canvas')).toHaveAttribute('data-tattoo-type','band');
 await expect(page.locator('#band-position')).toHaveValue('0.67');await expect(page.locator('#band-repeat')).toHaveValue('3');await expect(page.locator('#size')).toHaveValue('0.09');
 expect(await savePlacement(page)).toMatchObject({application:'band',bandPosition:.67,repeats:3,size:.09});
});

for(const sex of ['masculino','femenino']){
 test(`all section choices work on the ${sex} model`,async({page})=>{
  // Eleven full WebGL readbacks per model take longer on software-rendered CI.
  test.setTimeout(90000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await openStudio(page);
  await page.locator('#sex').selectOption(sex);await expect(page.locator('#canvas')).toHaveAttribute('data-model-state','ready');
  for(const zone of ['arm-left','arm-right','forearm-left','forearm-right','upperarm-left','upperarm-right','calf-left','calf-right','chest','back','full']){
   await page.locator('#zone').selectOption(zone);await expect(page.locator('#canvas')).toHaveAttribute('data-zone',zone);
   const frame=await sampleFrame(page);expect(frame.some((value,i)=>i%4!==3&&value>80),`${sex} ${zone} renders skin`).toBe(true);
  }
  expect(errors).toEqual([]);
 });
}
