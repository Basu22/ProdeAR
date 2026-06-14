import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			strategies: "injectManifest",
			srcDir: "src",
			filename: "service-worker.ts",
			selfDestroying: false,
			registerType: "autoUpdate",
			includeAssets: ["favicon.ico", "robots.txt", "gol_sound.mp3"],
			devOptions: {
				// Service Worker DESHABILITADO en dev. Por default vite-plugin-pwa
				// lo desactiva; lo activamos antes para que push notifications
				// funcionen en localhost. PERO el SW cachea agresivamente el bundle,
				// lo cual rompía la navegación del nav en dev (el primer click
				// navegaba al cache viejo sin el fix de hasHydrated).
				// Para testear push en dev: cambiar a `enabled: true` temporalmente.
				enabled: false,
				type: "module",
			},
			injectManifest: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,mp3}"],
			},
			// Sin `workbox: { ... }` — la lógica de precaching + runtime caching
			// vive dentro de src/service-worker.ts para poder agregar handlers
			// custom de `push` y `notificationclick`.
			// No fallback a HTML cacheado: la app es 100% online.
			// Preferimos error de red antes que contenido stale.
			manifest: {
				name: "ProdeAR",
				short_name: "ProdeAR",
				description:
					"Web App de Pronósticos Deportivos con Identidad Argentina",
				theme_color: "#0a0f1a",
				background_color: "#0a0f1a",
				display: "standalone",
				orientation: "portrait",
				icons: [
					{
						src: "logo-192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "logo-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "logo-192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "maskable",
					},
					{
						src: "logo-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
		}),
	],
	build: {
		rollupOptions: {
			output: {
				// Content-hash en todos los assets para cache busting automático
				entryFileNames: "assets/[name]-[hash].js",
				chunkFileNames: "assets/[name]-[hash].js",
				assetFileNames: "assets/[name]-[hash].[ext]",
			},
		},
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: "./src/__tests__/setup.ts",
	},
});
