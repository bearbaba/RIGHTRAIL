import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({build:{rollupOptions:{input:{
  main:fileURLToPath(new URL('./index.html',import.meta.url)),
  v2:fileURLToPath(new URL('./v2.html',import.meta.url))
}}}});
