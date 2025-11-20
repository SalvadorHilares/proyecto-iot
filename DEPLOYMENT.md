# 🚀 Guía de Despliegue - Amazonía Monitor

Esta guía te ayudará a desplegar tu aplicación en diferentes plataformas.

---

## 📋 Pre-Requisitos para Deploy

Antes de desplegar, asegúrate de que:

1. ✅ El proyecto se construye sin errores localmente
2. ✅ No hay errores de TypeScript
3. ✅ Todas las dependencias están instaladas
4. ✅ El proyecto está en un repositorio Git

**Verificar Build Local:**
```bash
npm run build
npm run preview
```

Si todo funciona correctamente, estás listo para desplegar.

---

## 🌐 Opción 1: Vercel (Recomendado)

Vercel es la plataforma oficial de Next.js y funciona perfectamente con Vite.

### Deploy Automático (GitHub)

1. **Sube tu código a GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Amazonía Monitor"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/amazonia-monitor.git
   git push -u origin main
   ```

2. **Conecta con Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Regístrate con GitHub
   - Click en "New Project"
   - Importa tu repositorio
   - Framework Preset: **Vite**
   - Click en "Deploy"

3. **Configuración Automática**
   Vercel detectará automáticamente:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Tu app estará en:**
   ```
   https://amazonia-monitor.vercel.app
   ```

### Deploy Manual (CLI)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy a producción
vercel --prod
```

**Ventajas de Vercel:**
- ✅ Deploy en segundos
- ✅ HTTPS automático
- ✅ CDN global
- ✅ Preview deploys automáticos
- ✅ 100% gratis para proyectos personales

---

## 📦 Opción 2: Netlify

Netlify es otra excelente opción para aplicaciones frontend.

### Deploy con Git

1. **Sube tu código a GitHub/GitLab/Bitbucket**

2. **Conecta con Netlify**
   - Ve a [netlify.com](https://netlify.com)
   - Click en "Add new site" → "Import from Git"
   - Conecta tu repositorio
   - Configura:
     ```
     Build command: npm run build
     Publish directory: dist
     ```
   - Click en "Deploy site"

3. **Tu app estará en:**
   ```
   https://amazonia-monitor.netlify.app
   ```

### Deploy Manual (Drag & Drop)

1. **Construye el proyecto**
   ```bash
   npm run build
   ```

2. **Ve a Netlify**
   - Abre [app.netlify.com/drop](https://app.netlify.com/drop)
   - Arrastra la carpeta `dist/` al navegador
   - ¡Listo!

**Ventajas de Netlify:**
- ✅ Drag & drop súper simple
- ✅ HTTPS automático
- ✅ CDN global
- ✅ Formularios integrados
- ✅ Funciones serverless

---

## ☁️ Opción 3: GitHub Pages

Perfecto si ya usas GitHub y quieres hosting gratuito.

### Configuración

1. **Instala gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Actualiza package.json**
   ```json
   {
     "homepage": "https://TU-USUARIO.github.io/amazonia-monitor",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Actualiza vite.config.ts**
   ```typescript
   export default defineConfig({
     base: '/amazonia-monitor/',
     // ... resto de config
   })
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

5. **Tu app estará en:**
   ```
   https://TU-USUARIO.github.io/amazonia-monitor
   ```

**Ventajas de GitHub Pages:**
- ✅ 100% gratis
- ✅ Integrado con GitHub
- ✅ Fácil de actualizar

---

## 🔥 Opción 4: Firebase Hosting

Google Firebase ofrece hosting gratuito con CDN global.

### Setup

1. **Instala Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login en Firebase**
   ```bash
   firebase login
   ```

3. **Inicializa Firebase**
   ```bash
   firebase init hosting
   ```
   
   Configuración:
   - Public directory: `dist`
   - Single-page app: `Yes`
   - GitHub deploys: `No` (por ahora)

4. **Build y Deploy**
   ```bash
   npm run build
   firebase deploy
   ```

5. **Tu app estará en:**
   ```
   https://amazonia-monitor.web.app
   ```

**Ventajas de Firebase:**
- ✅ CDN global de Google
- ✅ HTTPS automático
- ✅ Integración con otros servicios de Firebase
- ✅ Analytics incluido

---

## 🐳 Opción 5: Docker + VPS

Para más control y si tienes tu propio servidor.

### Crear Dockerfile

```dockerfile
# proyecto-iot/Dockerfile

# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Crear nginx.conf

```nginx
# proyecto-iot/nginx.conf

server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### Build y Run

```bash
# Build imagen
docker build -t amazonia-monitor .

# Run contenedor
docker run -d -p 80:80 amazonia-monitor
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
```

```bash
docker-compose up -d
```

---

## 🌍 Opción 6: Railway

Railway ofrece deploy simple con base de datos incluida.

1. **Ve a [railway.app](https://railway.app)**
2. Click en "Start a New Project"
3. "Deploy from GitHub repo"
4. Selecciona tu repositorio
5. Railway detectará Vite automáticamente
6. ¡Deploy automático!

**Tu app estará en:**
```
https://amazonia-monitor.up.railway.app
```

---

## 🔧 Configuración de Variables de Entorno

Para cualquier plataforma, si necesitas variables de entorno:

### Desarrollo (.env.local)
```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### Producción

**Vercel:**
- Settings → Environment Variables

**Netlify:**
- Site settings → Build & deploy → Environment variables

**Firebase:**
```bash
firebase functions:config:set api.url="https://api.example.com"
```

**Railway:**
- Variables tab en tu proyecto

---

## 📊 Comparación de Plataformas

| Plataforma | Dificultad | Velocidad | Gratis | CDN | HTTPS |
|------------|-----------|-----------|---------|-----|--------|
| Vercel | ⭐ | ⚡⚡⚡ | ✅ | ✅ | ✅ |
| Netlify | ⭐ | ⚡⚡⚡ | ✅ | ✅ | ✅ |
| GitHub Pages | ⭐⭐ | ⚡⚡ | ✅ | ✅ | ✅ |
| Firebase | ⭐⭐ | ⚡⚡⚡ | ✅ | ✅ | ✅ |
| Railway | ⭐ | ⚡⚡ | ✅* | ✅ | ✅ |
| Docker/VPS | ⭐⭐⭐⭐ | ⚡ | ❌ | ❌ | ⭐ |

*Railway: $5/mes después de créditos gratis

---

## 🔒 Checklist Pre-Deploy

Antes de hacer deploy a producción:

- [ ] ✅ Build funciona sin errores
- [ ] ✅ No hay errores de TypeScript
- [ ] ✅ No hay warnings críticos
- [ ] ✅ Pruebas en diferentes navegadores
- [ ] ✅ Pruebas en dispositivos móviles
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ favicon.ico presente
- [ ] ✅ robots.txt configurado
- [ ] ✅ Meta tags configurados
- [ ] ✅ Performance: Lighthouse > 90
- [ ] ✅ Accesibilidad: WCAG AA

---

## 🚨 Troubleshooting

### Error: Blank page después de deploy

**Solución:**
```typescript
// vite.config.ts
export default defineConfig({
  base: './', // En lugar de '/'
  // ...
})
```

### Error: 404 en rutas

Para SPA, configura redirects:

**Vercel:** Crear `vercel.json`
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Netlify:** Crear `_redirects` en `public/`
```
/*    /index.html   200
```

### Error: Environment variables no funcionan

- Variables DEBEN empezar con `VITE_`
- Reconstruir después de cambiarlas
- Verificar en la plataforma que están configuradas

---

## 📈 Post-Deploy

### Monitoreo

1. **Analytics:** Agrega Google Analytics
2. **Error Tracking:** Sentry.io
3. **Performance:** Lighthouse CI
4. **Uptime:** UptimeRobot

### Optimizaciones

1. **Cache Headers:** Configurar en hosting
2. **Compression:** Gzip/Brotli
3. **Image Optimization:** Usar CDN
4. **Lazy Loading:** Implementar para rutas

---

## 🎉 ¡Deploy Exitoso!

Una vez desplegado:

1. ✅ Prueba todas las funcionalidades
2. ✅ Verifica en móvil
3. ✅ Comparte el link
4. ✅ Configura dominio personalizado (opcional)

**Dominio Personalizado:**
- Compra dominio en Namecheap, GoDaddy, etc.
- Configura DNS apuntando a tu hosting
- Vercel/Netlify: Settings → Domains
- Espera propagación DNS (24-48 hrs)

---

**¡Tu Amazonía Monitor ya está en producción! 🌳🚀**

Para soporte adicional, consulta la documentación de cada plataforma.

