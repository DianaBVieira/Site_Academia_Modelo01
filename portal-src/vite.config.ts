import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serve este site em /Site_Academia_Modelo01/ (site de projeto,
// não domínio próprio como o da Brothers) — por isso o base precisa incluir
// esse prefixo, senão os assets pedem em dianabvieira.github.io/portal/...
// (raiz do domínio) em vez do caminho real do repositório.
export default defineConfig({ base: '/Site_Academia_Modelo01/portal/', plugins: [react()] })
