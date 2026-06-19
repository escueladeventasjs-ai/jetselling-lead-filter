# jetselling-lead-filter

Asistente de prediagnóstico para JetSelling® creado con Next.js App Router. La aplicación muestra un chat en español que recoge contexto, clasifica la solicitud y prepara un resumen para enviar a Natalia por WhatsApp.

## Funcionalidad

- Interfaz responsive con estética premium B2B de JetSelling®.
- Chat en español de España con tono humano, claro y profesional.
- Ruta API server-side en `/api/chat` que llama a OpenAI sin exponer la clave en el navegador.
- Clasificación de solicitudes en:
  - Kits de Ventas B2B
  - Programa Base JetSelling®
  - Formación para empresa
  - Workshop a medida
  - Soporte campus
  - No encaja ahora
- Generación de resumen listo para WhatsApp cuando hay contexto suficiente.

## Variables de entorno

Crea un archivo `.env.local` en desarrollo o configura estas variables en Vercel:

```bash
OPENAI_API_KEY=sk-...
WHATSAPP_NUMBER=34600000000
CONTACT_EMAIL=contacto@tudominio.com
OPENAI_MODEL=gpt-4.1-mini
```

Notas:

- `OPENAI_API_KEY` solo se usa en servidor desde `/api/chat`.
- `WHATSAPP_NUMBER` debe ir en formato internacional, sin espacios ni símbolos. Ejemplo: `34600000000`.
- `CONTACT_EMAIL` queda disponible para el proyecto y comunicaciones de contacto.
- Si `OPENAI_MODEL` no está definido, la app usa `gpt-4.1-mini`.

## Desarrollo local

Instala dependencias:

```bash
npm install
```

Arranca el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Comandos útiles

```bash
npm run build
npm run lint
npm run start
```

## Despliegue en Vercel

1. Sube el repositorio a GitHub, GitLab o Bitbucket.
2. Crea un nuevo proyecto en Vercel e importa el repositorio.
3. Configura las variables de entorno en **Project Settings → Environment Variables**:
   - `OPENAI_API_KEY`
   - `WHATSAPP_NUMBER`
   - `CONTACT_EMAIL`
   - `OPENAI_MODEL` (opcional)
4. Despliega. Vercel detectará Next.js automáticamente.

## Estructura principal

```text
app/
  api/chat/route.ts  # Endpoint server-side con OpenAI
  globals.css        # Estilos globales y diseño responsive
  layout.tsx         # Metadata y layout raíz
  page.tsx           # Interfaz del chat
```
