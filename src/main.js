import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { zones, resolveZone, isolateGeometry, limbFrame, bandGeometry } from './anatomy.js';
import { initSite } from './site.js';

if(location.pathname==='/admin'||location.pathname.startsWith('/admin/')){
 const {initAdmin}=await import('./admin.js');await initAdmin();
}else{
const $ = id => document.getElementById(id);
document.querySelector('#app').innerHTML = `
<header><a class="brand" href="#">INKFORMA<span> TATTOO STUDIO</span></a><nav><a href="#estudio">El estudio</a><a href="#experiencia">Probador 3D</a><a href="#biblioteca">Tu biblioteca</a></nav><a class="contact" href="#contacto">Hablemos ↗</a></header>
<main><section class="hero" id="estudio"><div class="eyebrow"><i></i> ARTE QUE SE QUEDA CONTIGO</div><h1>Tu piel.<br>Tu historia.<em>Tu próxima tinta.</em></h1><div class="hero-bottom"><p>Un espacio para imaginar lo que llevarás contigo.<br>Explora tu próximo tatuaje antes de dar el paso.</p><a href="#experiencia" class="button">Prueba tu diseño <span>↗</span></a></div><div class="hero-art" aria-hidden="true"><span>✳</span><small>EXPRESIÓN SIN LÍMITES · EST. 2026</small></div></section>
<section class="workspace" id="experiencia"><div class="section-title"><div><div class="eyebrow">01 / EXPLORA LAS POSIBILIDADES</div><h2>La idea empieza en tu piel.</h2></div><span class="badge">ANATOMÍA 3D · ESTUDIO VIRTUAL</span></div>
<div class="editor"><aside class="panel"><div class="panel-heading">Personaliza tu lienzo <span>01</span></div><label>Modelo corporal<select id="sex"><option value="masculino">Masculino</option><option value="femenino">Femenino</option></select></label><label>Contextura<select id="build"><option value="media">Media</option><option value="delgada">Delgada</option><option value="robusta">Robusta</option></select></label><label>Tono de piel <input id="skin" type="color" value="#bc8e73"></label><label class="zone-label">Zona para tatuar<select id="zone">${Object.entries(zones).map(([id,zone])=>`<option value="${id}">${zone.label}</option>`).join('')}</select></label><label class="check"><input id="isolate" type="checkbox" checked> Ver solo la zona seleccionada</label><p id="zone-help" class="hint">Elige una zona para trabajar de cerca y girarla en 360°.</p><div class="divider"></div><div class="panel-heading">Tu diseño <span>02</span></div><label class="upload" for="upload"><b>＋</b><strong>Sube tu tatuaje</strong><span>PNG, JPG o WEBP · Máx. 10 MB</span></label><input id="upload" type="file" accept="image/png,image/jpeg,image/webp" hidden><label class="check"><input type="checkbox" id="remove" checked> Quitar fondo blanco o claro</label><label>Sensibilidad del fondo<input type="range" id="threshold" min="180" max="250" value="225"></label><p class="hint">Los PNG transparentes dan el mejor resultado. El filtro aclara fondos uniformes; no recorta fotografías complejas.</p><div id="design-preview" class="design-preview">Tu diseño aparecerá aquí</div><label>Aplicación<select id="application"><option value="decal">Diseño localizado</option><option value="band">Brazalete envolvente · 360°</option></select></label><p id="application-help" class="hint">Coloca el diseño sobre una zona de piel.</p><button id="demo-band" type="button" class="subtle demo-band">Probar un brazalete de ejemplo ↗</button><label><span id="size-label">Tamaño del diseño</span><input id="size" type="range" min="0.03" max="1.2" step="0.01" value="0.45"></label><div id="band-controls" hidden><label>Posición en la extremidad<input id="band-position" type="range" min="0.08" max="0.92" step="0.01" value="0.5"></label><label>Repeticiones del patrón<input id="band-repeat" type="range" min="1" max="8" step="1" value="1"><output id="repeat-value">1 vuelta del diseño</output></label><p class="hint">Los extremos izquierdo y derecho de tu imagen se unen en la parte posterior. Usa una franja horizontal con bordes continuos.</p></div><label>Intensidad de tinta<input id="opacity" type="range" min="0.15" max="1" step="0.01" value="0.9"></label><label>Rotación del diseño<input id="rotation" type="range" min="-180" max="180" value="0"></label><div class="design-actions"><button id="flip" class="subtle" type="button">Reflejar diseño ↔</button><button id="clear" class="subtle" type="button">Quitar de la piel</button></div><button id="save" disabled>Guardar en biblioteca ↗</button></aside>
<div class="viewport"><div class="viewer-top"><span><i></i> LIENZO EN TIEMPO REAL</span><button id="reset" class="subtle">Restablecer vista ⤾</button></div><div class="viewer-toolbar" role="group" aria-label="Herramientas del probador"><button id="mode-orbit" aria-pressed="true" title="Arrastra para girar el cuerpo">↻ Girar cuerpo</button><button id="mode-move" aria-pressed="false" title="Arrastra sobre la piel para colocar o mover el tatuaje">✥ Mover tatuaje</button></div><div class="view-presets" role="group" aria-label="Vistas del cuerpo"><button data-view="front">Frente</button><button data-view="back">Espalda</button><button data-view="left">Lateral izq.</button><button data-view="right">Lateral der.</button><button id="auto-rotate" aria-pressed="false">Giro 360°</button></div><div id="canvas" aria-label="Probador de tatuajes 3D"></div><div class="model-caption"><span id="model-label">CARGANDO MODELO ANATÓMICO</span><span id="zone-caption">CUERPO COMPLETO</span></div><div class="viewer-bottom"><span id="status" role="status" aria-live="polite">Gira el cuerpo para explorar. Sube un diseño para colocarlo.</span><button id="export" class="subtle">Capturar imagen ↓</button></div><div class="orbit-hint">Elige una herramienta · Arrastra sobre la piel para mover la tinta · Rueda para acercar</div></div></div></section>
<section id="biblioteca" class="library-section"><div class="section-title"><div><div class="eyebrow">02 / IDEAS QUE VALE LA PENA GUARDAR</div><h2>Tu colección de tinta.</h2></div><span class="badge" id="count">0 DISEÑOS</span></div><p class="muted">Tus diseños se guardan en este navegador. Descárgalos para conservar una copia.</p><div id="library" class="library"></div></section>
<section id="contacto" class="contact-section"><div class="eyebrow">EL SIGUIENTE PASO ES TUYO</div><h2>Una idea hoy.<br>Una historia para siempre.</h2><p>Trae tu inspiración. Hagamos espacio para tu próxima pieza.</p><span class="badge">ESTUDIO DE DEMOSTRACIÓN · CONTACTO POR CONFIGURAR</span></section></main><footer><a class="brand" href="#">INKFORMA</a><span>Arte, piel e identidad.</span><span>Probador orientativo. El resultado real depende de la anatomía y la técnica.</span></footer>`;

let library=[];
try { library=JSON.parse(localStorage.getItem('inkforma-library') || '[]'); if(!Array.isArray(library)) library=[]; } catch { library=[]; }
let renderer,needsRender=true;
try { renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:true}); } catch { $('status').textContent='Este navegador no permite WebGL. Puedes subir y guardar diseños en la biblioteca.'; }
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x192122,6,14);
const camera=new THREE.PerspectiveCamera(36,1,0.1,100); camera.position.set(0,1.55,6.1);
let controls;
if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.setClearColor(0x192122);$('canvas').append(renderer.domElement);controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.5,0);controls.enableDamping=true;controls.minDistance=.2;controls.maxDistance=9;controls.maxPolarAngle=Math.PI*.92;controls.enablePan=true;}
scene.add(new THREE.HemisphereLight(0xdceaff,0x45433b,1.5));
const light=new THREE.DirectionalLight(0xffe4cb,3.2);light.position.set(3,5,4);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-3,right:3,top:4,bottom:-1,near:.1,far:15});light.shadow.normalBias=.015;scene.add(light);
const rim=new THREE.DirectionalLight(0xc7e5f2,2.5);rim.position.set(-3,3,-2);scene.add(rim);
const fill=new THREE.DirectionalLight(0xffffff,.7);fill.position.set(-3,2,4);scene.add(fill);
const body=new THREE.Group();scene.add(body);let surfaces=[],fullSurface=null,activeModel=null,zoneMesh=null,zoneFrame=null;
const skin=new THREE.MeshStandardMaterial({color:$('skin').value,roughness:.57,metalness:0});
const eyeMaterial=new THREE.MeshStandardMaterial({color:0xada394,roughness:.48});
const loader=new GLTFLoader(),models=new Map(),customCatalog=new Map();let modelRequest=0,selectedCustomModel=null;
async function makeBody(){
 const request=++modelRequest;const sex=$('sex').value,build=$('build').value;const gender=sex==='femenino'?'female':'male';const custom=selectedCustomModel,cacheKey=custom?`custom:${custom.id}`:gender,modelURL=custom?custom.url:`${import.meta.env.BASE_URL}models/${gender}.glb`;
 $('canvas').dataset.modelState='loading';$('model-label').textContent='CARGANDO ANATOMÍA…';
 if(renderer)$('status').textContent='Preparando el modelo anatómico…';
 try{
  if(!models.has(cacheKey))models.set(cacheKey,loader.loadAsync(modelURL).catch(error=>{models.delete(cacheKey);throw error;}));
  const gltf=await models.get(cacheKey);if(request!==modelRequest)return;
  const variant=custom?normalizeCustomModel(gltf.scene):gltf.scene.getObjectByName(build);if(!variant)throw Error('Variante no disponible');
  clearDecal();if(activeModel?.userData.custom)activeModel.traverse(mesh=>{if(mesh.isMesh)mesh.geometry.dispose();});if(zoneMesh)zoneMesh.geometry.dispose();zoneMesh=null;body.clear();surfaces=[];const model=variant.clone(true);activeModel=model;
  model.traverse(mesh=>{if(!mesh.isMesh)return;mesh.castShadow=true;mesh.receiveShadow=true;if(mesh.name.endsWith('-body')){mesh.material=skin;surfaces.push(mesh);}else mesh.material=eyeMaterial;});
  fullSurface=surfaces[0];body.add(model);body.updateMatrixWorld(true);applyZone();$('canvas').dataset.modelState='ready';$('canvas').dataset.bodyModel=custom?`custom-${custom.id}`:`${gender}-${build}`;
  $('model-label').textContent=custom?custom.title.toUpperCase():`${sex.toUpperCase()} / ${build.toUpperCase()} / MALLA ANATÓMICA`;
  if(renderer)$('status').textContent=custom?'Modelo del estudio listo. Admite diseños localizados; las zonas y brazaletes usan los modelos incluidos.':texture?'Modelo listo. Arrastra sobre la piel para volver a colocar el tatuaje.':'Modelo listo. Sube tu diseño para probarlo sobre la piel.';
 }catch(error){if(request!==modelRequest)return;$('canvas').dataset.modelState='error';$('model-label').textContent='NO SE PUDO CARGAR EL MODELO';$('status').textContent='No se pudo cargar la anatomía. Comprueba la conexión y cambia de modelo para reintentar.';console.error('Carga del modelo:',error);}
}
function normalizeCustomModel(source){
 const original=source.clone(true);original.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(original),height=bounds.max.y-bounds.min.y;
 if(!Number.isFinite(height)||height<=0)throw Error('El modelo no tiene una altura válida.');
 const center=bounds.getCenter(new THREE.Vector3()),scale=3/height,transform=new THREE.Matrix4().makeScale(scale,scale,scale).multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
 const positions=[],normals=[];original.traverse(mesh=>{if(!mesh.isMesh)return;const geometry=(mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(transform,mesh.matrixWorld));if(!geometry.attributes.normal)geometry.computeVertexNormals();positions.push(geometry.attributes.position.array);normals.push(geometry.attributes.normal.array);geometry.dispose();});
 const concat=arrays=>{const result=new Float32Array(arrays.reduce((sum,a)=>sum+a.length,0));let offset=0;arrays.forEach(a=>{result.set(a,offset);offset+=a.length;});return result;};
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(concat(positions),3));geometry.setAttribute('normal',new THREE.BufferAttribute(concat(normals),3));geometry.computeBoundingSphere();const group=new THREE.Group(),mesh=new THREE.Mesh(geometry,skin);mesh.name='custom-body';group.add(mesh);group.userData.custom=true;return group;
}
window.addEventListener('inkforma:models',event=>event.detail.forEach(model=>customCatalog.set(model.id,model)));
function chooseCustomModel(model){selectedCustomModel=model;$('sex').disabled=$('build').disabled=!!model;$('zone').disabled=!!model;$('application').querySelector('[value=band]').disabled=!!model;$('demo-band').disabled=!!model;if(model){$('zone').value='full';$('application').value='decal';}if($('custom-model'))$('custom-model').value=model?.id||'builtin';}
window.addEventListener('inkforma:select-model',event=>{chooseCustomModel(event.detail);makeBody();});
const floor=new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.12,.06,96),new THREE.MeshStandardMaterial({color:0x313d3c,roughness:.8}));floor.position.y=-.055;floor.receiveShadow=true;scene.add(floor);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x192122,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.09;ground.receiveShadow=true;scene.add(ground);
const grid=new THREE.GridHelper(10,40,0x61716c,0x3a4845);grid.position.y=-.085;grid.material.transparent=true;grid.material.opacity=.25;scene.add(grid);
let texture=null,source=null,decal=null,placement=null,flipped=false;
function clearDecal(){needsRender=true;if(decal){scene.remove(decal);decal.geometry.dispose();decal.material.dispose();decal=null;}placement=null;delete $('canvas').dataset.tattooType;}
function drawDecal(){needsRender=true;
 if(!placement || !texture)return;
 if(decal){scene.remove(decal);decal.geometry.dispose();decal.material.dispose();}
 if($('application').value==='band' && zoneFrame){
  if(texture.wrapS!==THREE.RepeatWrapping){texture.wrapS=THREE.RepeatWrapping;texture.needsUpdate=true;}
  const geometry=bandGeometry(surfaces[0].geometry,zoneFrame,{position:Number($('band-position').value),width:Number($('size').value),rotation:Number($('rotation').value),repeats:Number($('band-repeat').value),flipped});
  const material=new THREE.MeshStandardMaterial({map:texture,transparent:true,opacity:Number($('opacity').value),roughness:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4});
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','if (vMapUv.y < 0.0 || vMapUv.y > 1.0) discard;\n#include <map_fragment>');};
  material.customProgramCacheKey=()=> 'inkforma-cylindrical-band-v1';
  decal=new THREE.Mesh(geometry,material);decal.renderOrder=2;scene.add(decal);$('canvas').dataset.tattooType='band';return;
 }
 $('canvas').dataset.tattooType='decal';
 const normal=placement.normal;let up=new THREE.Vector3(0,1,0);if(Math.abs(normal.dot(up))>.97)up.set(0,0,-1);
 const right=new THREE.Vector3().crossVectors(up,normal).normalize();up.crossVectors(normal,right).normalize();
 const alignment=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,normal));alignment.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Number($('rotation').value)*Math.PI/180));
 const size=Number($('size').value),aspect=texture.image.width/texture.image.height;
 const geometry=new DecalGeometry(placement.mesh,placement.point,new THREE.Euler().setFromQuaternion(alignment),new THREE.Vector3(size*aspect,size,Math.min(.22,size*.45)));
 if(flipped){const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));}
 decal=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,transparent:true,opacity:Number($('opacity').value),roughness:.7,metalness:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4}));decal.renderOrder=2;scene.add(decal);
}
function processImage(){if(!source)return;const c=document.createElement('canvas');const scale=Math.min(1,1536/Math.max(source.width,source.height));c.width=Math.round(source.width*scale);c.height=Math.round(source.height*scale);const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,c.width,c.height);if($('remove').checked){const img=ctx.getImageData(0,0,c.width,c.height);const t=Number($('threshold').value);for(let i=0;i<img.data.length;i+=4){const v=Math.min(img.data[i],img.data[i+1],img.data[i+2]);img.data[i+3]*=1-Math.max(0,Math.min(1,(v-t)/18));}ctx.putImageData(img,0,0);}if(texture)texture.dispose();texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;$('design-preview').replaceChildren(c.cloneNode());$('design-preview').firstChild.getContext('2d').drawImage(c,0,0);$('save').disabled=false;if($('application').value==='band')ensureBandPlacement();drawDecal();setMode('move');$('status').textContent=$('application').value==='band'?'Brazalete aplicado alrededor de la extremidad. Gírala para revisar la unión y los laterales.':'Arrastra sobre la piel para colocar y mover tu tatuaje.';}
function loadImage(url,saved=null,inspect=false,onReady=null){const img=new Image();img.onload=()=>{source=img;processImage();if(saved && surfaces[0]){$('application').value=saved.application || 'decal';$('band-position').value=saved.bandPosition ?? .5;$('band-repeat').value=saved.repeats ?? 1;updateApplicationUI();placement={mesh:surfaces[0],point:new THREE.Vector3(...saved.point),normal:new THREE.Vector3(...saved.normal).normalize()};$('size').value=saved.size;$('rotation').value=saved.rotation;$('opacity').value=saved.opacity ?? .9;flipped=!!saved.flipped;drawDecal();}if(inspect)setMode('orbit');onReady?.();};img.onerror=()=>{$('status').textContent='No se pudo leer la imagen.';};img.src=url;}
$('upload').onchange=()=>{const file=$('upload').files[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){$('status').textContent='Usa un PNG, JPG o WEBP de hasta 10 MB.';return;}const reader=new FileReader();reader.onload=()=>loadImage(reader.result);reader.readAsDataURL(file);};
$('remove').onchange=processImage;$('threshold').oninput=processImage;$('size').oninput=drawDecal;$('rotation').oninput=drawDecal;$('opacity').oninput=drawDecal;$('flip').onclick=()=>{flipped=!flipped;drawDecal();};$('clear').onclick=()=>{clearDecal();$('status').textContent='Tatuaje retirado. Tu diseño sigue disponible para colocarlo otra vez.';};
$('skin').oninput=()=>{skin.color.set($('skin').value);needsRender=true;};$('sex').onchange=makeBody;$('build').onchange=makeBody;
const ray=new THREE.Raycaster();let mode='orbit',dragPointer=null;
function setMode(next){mode=next;if(controls&&mode==='move'){controls.autoRotate=false;$('auto-rotate').setAttribute('aria-pressed','false');}if(controls)controls.enabled=mode==='orbit';$('mode-orbit').setAttribute('aria-pressed',String(mode==='orbit'));$('mode-move').setAttribute('aria-pressed',String(mode==='move'));$('canvas').dataset.mode=mode;}
$('mode-orbit').onclick=()=>{setMode('orbit');$('status').textContent='Arrastra para girar el cuerpo. Usa la rueda o dos dedos para acercarte.';};
$('mode-move').onclick=()=>{setMode('move');$('status').textContent=texture?'Arrastra sobre cualquier zona de piel para mover el tatuaje.':'Primero sube o recupera un diseño de tu biblioteca.';};
function surfaceHit(event){
 if($('canvas').dataset.modelState!=='ready')return null;
 const rect=renderer.domElement.getBoundingClientRect();
 // A tiny screen-space tolerance covers exact symmetry seams in imported meshes.
 const tolerance=event.pointerType==='touch'?2:1;
 for(const [dx,dy] of [[0,0],[tolerance,0],[-tolerance,0],[0,tolerance],[0,-tolerance]]){
  ray.setFromCamera(new THREE.Vector2((event.clientX+dx-rect.left)/rect.width*2-1,-(event.clientY+dy-rect.top)/rect.height*2+1),camera);
  const hit=ray.intersectObjects(surfaces,false)[0];if(hit)return hit;
 }
 return null;
}
function placeAt(event){const hit=surfaceHit(event);if(!hit)return false;
 const geometry=hit.object.geometry,positions=geometry.attributes.position,normals=geometry.attributes.normal;
 if(geometry.userData.surfaceVertexCount!==undefined&&hit.faceIndex*3>=geometry.userData.surfaceVertexCount)return false;
 const a=new THREE.Vector3().fromBufferAttribute(positions,hit.face.a),b=new THREE.Vector3().fromBufferAttribute(positions,hit.face.b),c=new THREE.Vector3().fromBufferAttribute(positions,hit.face.c);
 const bary=THREE.Triangle.getBarycoord(hit.object.worldToLocal(hit.point.clone()),a,b,c,new THREE.Vector3());
 const normal=new THREE.Vector3().fromBufferAttribute(normals,hit.face.a).multiplyScalar(bary.x).addScaledVector(new THREE.Vector3().fromBufferAttribute(normals,hit.face.b),bary.y).addScaledVector(new THREE.Vector3().fromBufferAttribute(normals,hit.face.c),bary.z).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
 placement={mesh:hit.object,point:hit.point.clone(),normal};if($('application').value==='band'&&zoneFrame){const t=zoneFrame.positionOf(hit.point);$('band-position').value=THREE.MathUtils.clamp(t,.08,.92);}drawDecal();$('status').textContent='Tatuaje sobre la piel. Sigue arrastrando para moverlo; cambia a Girar cuerpo para explorar.';return true;
}
if(renderer){const canvas=renderer.domElement;
 canvas.addEventListener('pointerdown',event=>{if(mode!=='move'||!texture||dragPointer!==null||event.button!==0)return;if(placeAt(event)){event.preventDefault();dragPointer=event.pointerId;canvas.setPointerCapture(event.pointerId);canvas.classList.add('dragging');}},true);
 canvas.addEventListener('pointermove',event=>{if(event.pointerId===dragPointer){event.preventDefault();placeAt(event);}});
 const finish=event=>{if(event.pointerId!==dragPointer)return;dragPointer=null;canvas.classList.remove('dragging');if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);};
 canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
}
function selectionBounds(){return new THREE.Box3().setFromObject($('zone').value==='full'?body:zoneMesh || body);}
function setView(view='front'){
 if(!controls)return;const bounds=selectionBounds(),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const angle=Math.min(camera.fov*Math.PI/180,2*Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect));
 const distance=$('zone').value==='full'?6.1:Math.max(.5,size.length()*.5/Math.sin(angle/2)*1.12);
 const directions={front:[0,.008,1],back:[0,.008,-1],left:[1,.008,0],right:[-1,.008,0]};
 controls.autoRotate=false;$('auto-rotate').setAttribute('aria-pressed','false');
 controls.enableDamping=false;controls.target.copy(center);camera.position.copy(center).addScaledVector(new THREE.Vector3(...directions[view]).normalize(),distance);camera.lookAt(center);controls.update();controls.enableDamping=true;
}
$('reset').onclick=()=>setView($('zone').value==='back'?'back':'front');document.querySelectorAll('[data-view]').forEach(button=>button.onclick=()=>setView(button.dataset.view));
$('auto-rotate').onclick=()=>{if(!controls)return;const active=!controls.autoRotate;setMode('orbit');controls.autoRotate=active;controls.autoRotateSpeed=1.3;$('auto-rotate').setAttribute('aria-pressed',String(active));$('status').textContent=active?'Inspección 360° activa. Revisa cómo sigue el diseño la superficie y cómo se unen sus bordes.':'Giro detenido. Puedes girar la zona manualmente.';};
function refreshVisibility(){
 if(!activeModel)return;const isolated=$('zone').value!=='full'&&$('isolate').checked;
 activeModel.visible=!isolated;if(zoneMesh)zoneMesh.visible=isolated;
 floor.visible=ground.visible=grid.visible=!isolated;
 $('canvas').dataset.isolated=String(isolated);
}
function applyZone(){needsRender=true;
 if(!fullSurface)return;clearDecal();if(zoneMesh){body.remove(zoneMesh);zoneMesh.geometry.dispose();zoneMesh=null;}zoneFrame=null;
 const id=$('zone').value,zone=resolveZone(id,activeModel.userData.joints);
 if(id==='full'){surfaces=[fullSurface];}else{
  const geometry=isolateGeometry(fullSurface.geometry,zone);zoneMesh=new THREE.Mesh(geometry,skin);zoneMesh.castShadow=true;zoneMesh.receiveShadow=true;body.add(zoneMesh);surfaces=[zoneMesh];
  if(zone.start)zoneFrame=limbFrame(geometry,zone);
 }
 if($('application').value==='band'&&!zoneFrame)$('application').value='decal';
 body.updateMatrixWorld(true);refreshVisibility();updateApplicationUI();
 $('canvas').dataset.zone=id;$('zone-caption').textContent=zone.label.toUpperCase();
 $('zone-help').textContent=id==='full'?'Elige una zona para trabajar de cerca y girarla en 360°.':`${zone.label}: usa las vistas o arrastra en Girar cuerpo para inspeccionar toda su superficie.`;
 setView(id==='back'?'back':'front');
 if(texture&&$('application').value==='band'){ensureBandPlacement();drawDecal();}
}
function ensureBandPlacement(){if(!texture||!zoneFrame)return;placement={mesh:surfaces[0],point:zoneFrame.pointAt(Number($('band-position').value)),normal:zoneFrame.front.clone()};}
function updateApplicationUI(){
 const band=$('application').value==='band';$('band-controls').hidden=!band;$('size-label').textContent=band?'Ancho del brazalete':'Tamaño del diseño';
 $('application-help').textContent=band?'La imagen envuelve la extremidad completa. La rotación desplaza el patrón alrededor de la piel.':'Coloca el diseño sobre una zona de piel.';
 $('repeat-value').textContent=`${$('band-repeat').value} ${$('band-repeat').value==='1'?'vuelta del diseño':'repeticiones alrededor'}`;
}
$('zone').onchange=()=>{applyZone();$('status').textContent='Zona seleccionada. Gírala para explorar o coloca tu diseño sobre la piel.';};
$('isolate').onchange=refreshVisibility;
$('application').onchange=()=>{
 const band=$('application').value==='band';
 if(band&&!zoneFrame){$('zone').value='forearm-left';applyZone();$('application').value='band';}
 clearDecal();if(band){$('size').value=.12;ensureBandPlacement();drawDecal();}
 updateApplicationUI();$('status').textContent=band?'Modo brazalete: sube una franja horizontal o prueba el ejemplo. Gira la extremidad para revisar los 360°.':'Modo localizado: arrastra tu diseño sobre la piel.';
};
$('band-position').oninput=()=>{ensureBandPlacement();drawDecal();};$('band-repeat').oninput=()=>{updateApplicationUI();drawDecal();};
$('demo-band').onclick=()=>{
 $('zone').value='forearm-left';applyZone();$('application').value='band';$('size').value=.12;$('rotation').value=0;$('band-repeat').value=1;$('band-position').value=.5;flipped=false;$('remove').checked=false;updateApplicationUI();
 const c=document.createElement('canvas');c.width=1024;c.height=160;const ctx=c.getContext('2d');ctx.strokeStyle='#171b17';ctx.lineWidth=8;
 for(const y of [14,30,130,146]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke();}
 for(let x=0;x<=1024;x+=128){ctx.beginPath();ctx.moveTo(x-52,80);ctx.lineTo(x,42);ctx.lineTo(x+52,80);ctx.lineTo(x,118);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.arc(x,80,8,0,Math.PI*2);ctx.fillStyle='#171b17';ctx.fill();}
 loadImage(c.toDataURL(),null,true);
};
$('export').onclick=()=>{if(!renderer)return;renderer.render(scene,camera);download(renderer.domElement.toDataURL('image/png'),'inkforma-vista.png');};
function download(url,name){const a=document.createElement('a');a.href=url;a.download=name;a.click();}
function persist(next){try{localStorage.setItem('inkforma-library',JSON.stringify(next));library=next;renderLibrary();return true;}catch{$('status').textContent='No hay espacio local disponible. Descarga tu diseño antes de continuar.';return false;}}
$('save').onclick=()=>{if(!texture)return;const next=[{id:crypto.randomUUID(),image:texture.image.toDataURL('image/png'),date:new Date().toLocaleDateString('es'),sex:$('sex').value,build:$('build').value,skin:$('skin').value,customModelId:selectedCustomModel?.id||null,zone:$('zone').value,isolate:$('isolate').checked,placement:placement?{point:placement.point.toArray(),normal:placement.normal.toArray(),size:Number($('size').value),rotation:Number($('rotation').value),opacity:Number($('opacity').value),flipped,application:$('application').value,bandPosition:Number($('band-position').value),repeats:Number($('band-repeat').value)}:null},...library];if(persist(next))$('status').textContent='Diseño guardado en la biblioteca de este navegador.';};
function renderLibrary(){$('count').textContent=`${library.length} DISEÑOS`;$('library').replaceChildren();if(!library.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Tu próxima idea tiene un lugar aquí. Sube un diseño y guárdalo para empezar.';$('library').append(empty);}library.forEach((item,i)=>{const card=document.createElement('article');card.className='design-card';const img=document.createElement('img');img.src=item.image;img.alt=`Diseño de tatuaje ${i+1}`;const caption=document.createElement('p');caption.textContent=`Diseño ${library.length-i} · ${item.date}`;const actions=document.createElement('div');for(const [label,action] of [['Usar',async()=>{if(item.skin){if(item.customModelId&&!customCatalog.has(item.customModelId)){$('status').textContent='El modelo guardado ya no está publicado o no se pudo cargar. El diseño sigue disponible para descargar.';return;}chooseCustomModel(item.customModelId?customCatalog.get(item.customModelId):null);$('skin').value=item.skin;skin.color.set(item.skin);$('sex').value=item.sex;$('build').value=item.build;$('zone').value=zones[item.zone]?item.zone:'full';$('isolate').checked=item.isolate ?? true;await makeBody();}$('remove').checked=false;loadImage(item.image,item.placement);$('experiencia').scrollIntoView({behavior:'smooth'});}],['Descargar',()=>download(item.image,'inkforma-tatuaje.png')],['Eliminar',()=>persist(library.filter(x=>x.id!==item.id))]]){const b=document.createElement('button');b.textContent=label;b.onclick=action;actions.append(b);}card.append(img,caption,actions);$('library').append(card);});}
let designRequest=0;
window.addEventListener('inkforma:try-design',async event=>{
 const request=++designRequest,{url,title}=event.detail;
 // Only packaged examples or same-origin, server-validated gallery media.
 if(!/^\/(designs\/[a-z]+\.svg|media\/[0-9a-f-]{36}\.webp)$/.test(url))return;
 $('experiencia').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 chooseCustomModel(null);$('zone').value='forearm-left';$('isolate').checked=true;$('application').value='decal';$('size').value=.20;$('rotation').value=0;$('opacity').value=.9;$('remove').checked=false;flipped=false;
 await makeBody();if(request!==designRequest||$('canvas').dataset.modelState!=='ready')return;
 loadImage(url,null,false,()=>{
  if(request!==designRequest)return;
  setView('front');camera.updateMatrixWorld(true);
  const rect=renderer?.domElement.getBoundingClientRect();const placed=rect&&placeAt({clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2});
  $('status').textContent=placed?`${title}: ya está sobre la piel. Arrastra para moverlo o elige Girar cuerpo para verlo desde otro ángulo.`:`${title}: diseño cargado. Toca la piel para colocarlo.`;
 });
});
makeBody();renderLibrary();initSite();
if(renderer){const observer=new ResizeObserver(()=>{const w=$('canvas').clientWidth,h=$('canvas').clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});observer.observe($('canvas'));controls.addEventListener('change',()=>{needsRender=true;});let visible=true;new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe($('canvas'));renderer.setAnimationLoop(()=>{if((!visible&&!needsRender)||document.hidden)return;controls.update();renderer.render(scene,camera);needsRender=false;});}

}
