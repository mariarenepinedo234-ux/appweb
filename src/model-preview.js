import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export async function previewModel(container,url){
 const gltf=await new GLTFLoader().loadAsync(url),scene=new THREE.Scene();scene.background=new THREE.Color(0x192122);const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 if(!Number.isFinite(size.length())||size.length()===0)throw Error('Modelo vacío');
 gltf.scene.position.sub(center);scene.add(gltf.scene,new THREE.HemisphereLight(0xffffff,0x393e35,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,5,4);scene.add(light);
 const camera=new THREE.PerspectiveCamera(40,1,.001,10000);camera.position.set(0,size.y*.1,size.length()*1.6);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));container.replaceChildren(renderer.domElement);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
 const observer=new ResizeObserver(()=>{const width=container.clientWidth,height=container.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();});observer.observe(container);renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
 return ()=>{observer.disconnect();controls.dispose();renderer.setAnimationLoop(null);gltf.scene.traverse(node=>{if(node.isMesh){node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material]){for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.dispose();}}});renderer.dispose();container.replaceChildren();};
}
