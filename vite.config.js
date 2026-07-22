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
          // Admin tab chunks (lazy-loaded)
          if (id.includes('src/pages/admin/BioTab')) return 'admin-bio';
          if (id.includes('src/pages/admin/PostsTab')) return 'admin-posts';
          if (id.includes('src/pages/admin/DealsTab')) return 'admin-deals';
          if (id.includes('src/pages/admin/PressTab')) return 'admin-press';
          if (id.includes('src/pages/admin/AlertsTab')) return 'admin-alerts';
          if (id.includes('src/pages/admin/FAQsTab')) return 'admin-faqs';
          if (id.includes('src/pages/admin/TestimonialsTab')) return 'admin-testimonials';
          if (id.includes('src/pages/admin/PageBuilderTab')) return 'admin-page-builder';
          if (id.includes('src/pages/admin/SectionTypesTab')) return 'admin-section-types';
          if (id.includes('src/pages/admin/HomeContentTab')) return 'admin-home-content';
          if (id.includes('src/pages/admin/MarketingPagesTab')) return 'admin-marketing';
          if (id.includes('src/pages/admin/ContactFormTab')) return 'admin-contact-form';
          if (id.includes('src/pages/admin/ThemesTab')) return 'admin-themes';
          if (id.includes('src/pages/admin/CasesTab')) return 'admin-cases';
          if (id.includes('src/pages/admin/IntelligenceDefaultsTab')) return 'admin-intelligence-defaults';
          if (id.includes('src/pages/admin/StructureFaviconsTab')) return 'admin-favicons';
          if (id.includes('src/pages/admin/StructureSiteMetaTab')) return 'admin-site-meta';
          if (id.includes('src/pages/admin/StructureNavItemsTab')) return 'admin-navigation';
          if (id.includes('src/pages/admin/StructureFooterTab')) return 'admin-footer';
          if (id.includes('src/pages/admin/RoutesTab')) return 'admin-routes';
          if (id.includes('src/pages/admin/AssetsTab')) return 'admin-assets';
          if (id.includes('src/pages/admin/BriefingsTab')) return 'admin-briefings';
        },
      },
    },
  },
})
