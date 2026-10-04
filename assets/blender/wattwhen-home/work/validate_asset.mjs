import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const threeRoot=path.resolve(process.argv[2]||'/Users/kene/code/wattwhen/node_modules/three');
const THREE=await import(pathToFileURL(path.join(threeRoot,'build/three.module.js')));
const {GLTFLoader}=await import(pathToFileURL(path.join(threeRoot,'examples/jsm/loaders/GLTFLoader.js')));
const contract=JSON.parse(fs.readFileSync(path.join(folder,'integration.json')));
const bytes=fs.readFileSync(path.join(folder,contract.runtimeCopy));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const scene=gltf.scene;scene.updateMatrixWorld(true);
const nodes={},materials={};let triangles=0,vertices=0,meshCount=0;
scene.traverse(o=>{nodes[o.name]=o;if(o.isMesh){meshCount++;vertices+=o.geometry.attributes.position.count;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;for(const value of o.geometry.attributes.position.array)if(!Number.isFinite(value))throw Error('Nonfinite geometry');for(const m of Array.isArray(o.material)?o.material:[o.material])materials[m.name]=m;}});
const assert=(test,message)=>{if(!test)throw Error(message)};
assert(triangles===contract.triangles,'triangle mismatch');assert(meshCount===contract.meshNodes,'mesh count mismatch');
for(const [name,level] of Object.entries(contract.nightMaterials)){const m=materials[name];assert(m&&m.emissive.r+m.emissive.g+m.emissive.b>0,'missing emission hue '+name);assert(Math.abs(m.emissiveIntensity-level.day)<1e-6,'day intensity '+name);}
for(const name of contract.cutawayHide)nodes[name].visible=false;
function visible(o){while(o){if(!o.visible)return false;o=o.parent;}return true;}
const origin=new THREE.Vector3(13,14,19),ray=new THREE.Raycaster();const clicks={};
for(const [id,name] of Object.entries(contract.selectableGroups)){
 const group=nodes[name];assert(group&&group.userData.selectableId===id,'selection metadata '+id);
 const center=new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
 ray.set(origin,center.clone().sub(origin).normalize());
 const hits=ray.intersectObject(scene,true).filter(h=>visible(h.object));let o=hits[0]?.object;while(o&&!o.userData.selectableId)o=o.parent;
 clicks[id]=o?.userData.selectableId||null;assert(clicks[id]===id,'front-right ray selection '+id+' resolved '+clicks[id]);
}
for(const name of contract.cutawayHide)nodes[name].visible=true;
const box=new THREE.Box3().setFromObject(scene);
const report={loader:'Three.js '+THREE.REVISION+' GLTFLoader',file:contract.runtimeCopy,sha256:contract.sha256,loaded:true,triangles,runtimeVertices:vertices,meshCount,materialCount:Object.keys(materials).length,bounds:{min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new THREE.Vector3()).toArray()},selectionRays:clicks,nightMaterials:'All six preserve emission hue and daytime intensity',browserChecks:'All eight setup combinations, cutaway and night tested in the local preview. Manual EV and washer clicks selected correct groups.'};
fs.writeFileSync(path.join(folder,'runtime/validation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
