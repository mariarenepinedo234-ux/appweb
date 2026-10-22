import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
export async function startHeroPreview(container,toggle){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(33,1,.1,30),resources=[];
 let controls,resize,intersection,disposed=false,visible=true;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function dispose(){if(disposed)return;disposed=true;resize?.disconnect();intersection?.disconnect();controls?.dispose();renderer.setAnimationLoop(null);for(const resource of new Set(resources))resource.dispose();renderer.dispose();renderer.domElement.remove();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motion);toggle.onclick=null;}
 function visibility(){if(disposed)return;renderer.setAnimationLoop(visible&&!document.hidden?()=>{controls.update();renderer.render(scene,camera);}:null);}
 function sync(){toggle.hidden=false;toggle.textContent=controls.autoRotate?'Pausar giro':'Girar modelo';toggle.setAttribute('aria-pressed',String(controls.autoRotate));}
 function motion(){if(reduced.matches){controls.autoRotate=false;sync();}}
 try{
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0x202e28,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  renderer.domElement.setAttribute('aria-label','Vista previa 3D del cuerpo con un tatuaje botánico');
  const gltf=await new GLTFLoader().loadAsync('/models/male.glb');const body=gltf.scene.getObjectByName('media').clone(true);scene.add(body);let surface;
  body.traverse(mesh=>{if(!mesh.isMesh)return;resources.push(mesh.geometry);mesh.material=new THREE.MeshStandardMaterial({color:mesh.name.endsWith('-body')?0xc6a084:0x897b6b,roughness:.65});resources.push(mesh.material);if(mesh.name.endsWith('-body'))surface=mesh;});
  scene.add(new THREE.HemisphereLight(0xe8f2dc,0x293a30,2.1));const key=new THREE.DirectionalLight(0xffe6d3,3.8);key.position.set(3,5,4);const rim=new THREE.DirectionalLight(0xc9e0d4,2.5);rim.position.set(-3,3,-2);scene.add(key,rim);
  camera.position.set(.12,2.28,1.95);camera.lookAt(0,2.25,0);scene.updateMatrixWorld(true);
  const texture=await new THREE.TextureLoader().loadAsync('/designs/botanica.svg');texture.colorSpace=THREE.SRGBColorSpace;resources.push(texture);
  const ray=new THREE.Raycaster(new THREE.Vector3(.12,2.14,2),new THREE.Vector3(0,0,-1));const hit=ray.intersectObject(surface)[0];
  if(hit){const normal=hit.face.normal.clone().transformDirection(surface.matrixWorld),rotation=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),normal));const geometry=new DecalGeometry(surface,hit.point,rotation,new THREE.Vector3(.32,.53,.24)),material=new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:.8,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4});scene.add(new THREE.Mesh(geometry,material));resources.push(geometry,material);container.dataset.tattooVertices=String(geometry.attributes.position.count);}
  controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,2.25,0);controls.enableDamping=true;controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=Math.PI*.28;controls.maxPolarAngle=Math.PI*.62;controls.autoRotate=!reduced.matches;controls.autoRotateSpeed=.8;controls.update();
  container.querySelector('img')?.remove();container.querySelector('button')?.remove();container.append(renderer.domElement);
  toggle.onclick=()=>{controls.autoRotate=!controls.autoRotate;sync();};controls.addEventListener('start',()=>{controls.autoRotate=false;sync();});sync();
  resize=new ResizeObserver(()=>{const width=container.clientWidth,height=container.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();});resize.observe(container);
  intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visibility();});intersection.observe(container);document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',motion);visibility();
  return dispose;
 }catch(error){dispose();throw error;}
}
