import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "embed.ts"),
      name: "EchoWidget",
      // Emit widget.js rather than the default widget.iife.js - this is the
      // public URL customers paste into their site
      fileName: () => "widget.js",
      formats: ["iife"],
    },
    rollupOptions: {
      output: {
        extend: true,
      }
    }
  },
  server: {
    port: 3002,
    open: "/demo.html"
  },
});
