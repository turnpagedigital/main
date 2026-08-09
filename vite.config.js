import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Admin bundle (with TipTap editor) exceeds 500KB, so we split by tab to load on-demand
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core vendor chunks
          if (id.includes('node_modules/react')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/@tiptap')) {
            return 'tiptap-editor';
          }
          // Section components + their markdown/sanitizer/QR deps live in their
          // own chunks (shared by the public PageRenderer and the admin Page
          // Builder), so they load once and aren't welded into an admin chunk.
          if (id.includes('src/components/sections/') || id.includes('CryptoClaimsChart')) return 'sections';
          if (id.includes('node_modules/marked/')) return 'vendor-marked';
          if (id.includes('node_modules/dompurify/')) return 'vendor-dompurify';
          if (id.includes('node_modules/qrcode/')) return 'vendor-qrcode';
          // Admin tabs are ALREADY lazy-loaded (lazy(() => import(...))) in
          // Admin.jsx and its hub tabs, so Vite auto-splits each into its own
          // chunk on demand. We deliberately DON'T hand-name them: the old
          // per-tab manualChunks rules made Rollup hoist shared admin modules
          // into named chunks that the public entry then statically imported,
          // pulling ~180KB gzip of admin JS onto every marketing page. Letting
          // Vite chunk them automatically keeps admin code off the public path.
        },
      },
    },
  },
})
