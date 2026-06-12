# Despliegue

## Local

```bash
npm install
npm run build
npm run preview
```

## VPS (nginx + pm2)

```bash
# Build
npm ci && npm run build

# Servir /dist con nginx
sudo cp -r dist/* /var/www/streampanel/
```

Ejemplo nginx:

```nginx
server {
  listen 80;
  server_name panel.tudominio.com;
  root /var/www/streampanel;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```

## Hosts estáticos

Funciona out-of-the-box en **Vercel, Netlify, Cloudflare Pages**.
Build command: `npm run build` · Output dir: `dist`.

## Variables de entorno

Copia `.env.example` → `.env` y ajusta. Solo las variables `VITE_*` llegan al cliente.
