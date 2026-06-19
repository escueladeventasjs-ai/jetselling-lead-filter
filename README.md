# jetselling-lead-filter

Asistente de prediagnóstico para JetSelling® creado con Next.js App Router. La aplicación muestra un chat en español que recoge contexto, clasifica la solicitud y prepara un resumen para enviar a Natalia por WhatsApp.

## Funcionalidad

- Interfaz responsive con estética premium B2B de JetSelling®.
- Chat en español de España con tono humano, claro y profesional.
- Recomendación de entrenamientos para particulares, profesionales individuales y personas emprendedoras B2B.
- Ruta API server-side en `/api/chat` que llama a OpenAI sin exponer la clave en el navegador.
- Clasificación de solicitudes en:
  - Kits de Ventas B2B
  - Programa Base JetSelling®
  - Formación para empresa
  - Workshop a medida
  - Soporte campus
  - No encaja ahora
- Generación de resumen listo para WhatsApp cuando hay contexto suficiente.

## Lógica de recomendación para particulares

Cuando el usuario es una persona individual, profesional B2B o emprendedor/a, el asistente hace pocas preguntas para entender:

1. Qué vende.
2. A quién vende.
3. Qué parte de la venta se le está haciendo más difícil ahora.

Con ese contexto recomienda una única opción principal y, solo si tiene sentido, menciona una alternativa secundaria sin sonar a catálogo ni prometer resultados. Las opciones base son:

- **Prospección Comercial B2B**: para bloqueos al abrir conversaciones, prospectar, definir a quién contactar, mejorar respuesta a mensajes o generar oportunidades.
- **Negociación Comercial B2B**: para bloqueos de precio, competencia, objeciones, descuentos, defensa de valor, cesiones excesivas, negociaciones atascadas o cierre de acuerdos con más estructura.
- **Catálogo de entrenamientos de ventas B2B**: cuando la persona no tiene claro el bloqueo o quiere comparar opciones.
- **Programa Base JetSelling®**: cuando no parece una habilidad aislada, sino falta de estructura general, método o una ruta completa de entrenamiento comercial.

La respuesta de `/api/chat` incluye `recommended_product`. Si `recommended_product.show` es `true`, el frontend muestra una tarjeta de **Entrenamiento recomendado** con el nombre, la razón, el botón principal “Ver entrenamiento recomendado” y el botón secundario “Contactar con Natalia por WhatsApp”.


## Respuesta de `/api/chat`

El endpoint devuelve siempre JSON con esta forma:

```json
{
  "reply": "mensaje del asistente",
  "lead_type": "individual | empresa | kit | programa_base | workshop | soporte | no_encaja | unknown",
  "ready_for_handoff": true,
  "recommended_next_step": "siguiente paso recomendado",
  "whatsapp_summary": "resumen para Natalia",
  "recommended_product": {
    "show": true,
    "name": "nombre del entrenamiento recomendado",
    "type": "kit | programa_base | catalogo | soporte | none",
    "reason": "por qué encaja",
    "url": "url del entrenamiento o catálogo",
    "cta_label": "texto del botón"
  }
}
```

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
