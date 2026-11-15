import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { ServerResponse } from "node:http";
import path from "node:path";
import { bipEsp, bipFort, buzzerIp } from "./server/buzzer.ts";
import { fingerprintStatus, fingerprintVerify } from "./server/fingerprint.ts";

function send(res: ServerResponse, body: unknown) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

/** Buzzer Wi-Fi (ESP32-C3) et empreinte du PC. Pas de radio Bluetooth. */
function devicePlugin(espIp: string): Plugin {
  return {
    name: "pulsar-device",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url === "/__buzzer/fort" && req.method === "POST") {
          void bipFort(espIp, 12).then((result) => send(res, result));
          return;
        }
        if (url === "/__buzzer/bip" && req.method === "POST") {
          void bipEsp(espIp).then((result) => send(res, result));
          return;
        }
        if (url === "/__print/status" && req.method === "GET") {
          void fingerprintStatus().then((result) => send(res, result));
          return;
        }
        if (url === "/__print/verify" && req.method === "POST") {
          void fingerprintVerify().then((result) => send(res, result));
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  const espIp = buzzerIp(env.ESP_BUZZER_IP);
  return {
    plugins: [react(), tailwindcss(), devicePlugin(espIp)],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
    optimizeDeps: { include: ["three", "@react-three/fiber", "@react-three/drei"] },
    server: { host: true, port: 5173, strictPort: false },
    preview: { port: 4173 },
    // three.js (~1 MB) loads only when the 3D silhouette is shown (dynamic import in BodyFigure).
    build: { chunkSizeWarningLimit: 1200 },
  };
});
