// Testing on myhousingmap.uk

// Testing on SERVER

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      "myhousingmap.uk",
      "www.myhousingmap.uk",
      "178.62.25.85",
      "localhost",
      "127.0.0.1",
    ],
    proxy: {
      "/api": {
        target: "http://web:8000",
        changeOrigin: true,
      },
    },
  },
});





/*
// Testing on SERVER

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://web:8000",
        changeOrigin: true,
      },
    },
  },
});
*/

/* 
// Testing on LOCAL machine

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://178.62.25.85:8000",
        changeOrigin: true,
      },
    },
  },
}); */