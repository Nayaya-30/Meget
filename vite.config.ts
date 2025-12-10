import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/main.tsx'),
			name: 'TourWidget',
			fileName: 'tour-widget',
		},
		rollupOptions: {
			external: ['react', 'react-dom'], // If we want to bundle react, remove this
			output: {
				globals: {
					react: 'React',
					'react-dom': 'ReactDOM',
				},
			},
		},
	},
});
