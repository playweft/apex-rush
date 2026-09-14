import { defineConfig, loadEnv } from 'vite';
import { readFile } from 'node:fs/promises';
import { normalizeBasePath, nestStaticSite } from './build/vite/base-path.js';
export default defineConfig(({mode,command})=>{
  const base=command==='build'?normalizeBasePath(loadEnv(mode,import.meta.dirname,'BASE_PATH').BASE_PATH):'/';
  return {base,plugins:[{name:'playweft-package',async generateBundle(){
    const manifest=JSON.parse(await readFile(new URL('./public/playweft.json',import.meta.url),'utf8'));manifest.id=base;
    this.emitFile({type:'asset',fileName:'playweft.json',source:JSON.stringify(manifest,null,2)});
  },async closeBundle(){await nestStaticSite(new URL('./dist',import.meta.url).pathname,base);}}]};
});
