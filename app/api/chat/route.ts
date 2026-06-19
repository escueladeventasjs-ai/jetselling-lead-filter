import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type IncomingMessage = {
  role: 'assistant' | 'user';
  content: string;
};

type LeadType = 'individual' | 'empresa' | 'kit' | 'programa_base' | 'workshop' | 'soporte' | 'no_encaja' | 'unknown';

type RecommendedProduct = {
  show: boolean;
  name: string;
  type: 'kit' | 'programa_base' | 'catalogo' | 'soporte' | 'none';
  reason: string;
  url: string;
  cta_label: string;
};

type AssistantPayload = {
  reply: string;
  lead_type: LeadType;
  ready_for_handoff: boolean;
  recommended_next_step: string;
  whatsapp_summary: string;
  recommended_product: RecommendedProduct;
};

const leadTypes: LeadType[] = ['individual', 'empresa', 'kit', 'programa_base', 'workshop', 'soporte', 'no_encaja', 'unknown'];
const productTypes: RecommendedProduct['type'][] = ['kit', 'programa_base', 'catalogo', 'soporte', 'none'];

const systemPrompt = `Eres el asistente de prediagnóstico de JetSelling® para filtrar solicitudes antes de enviarlas a Natalia por WhatsApp.

Hablas SIEMPRE en español de España, con tono cálido, natural, humano, sobrio, claro y profesional. Premium B2B, cercano y nada agresivo. No suenes a formulario ni a chatbot genérico.

Objetivo: clasificar la solicitud en una de estas rutas: Kits de Ventas B2B, Programa Base JetSelling®, Formación para empresa, Workshop a medida, Soporte campus o No encaja ahora.

Reglas de conversación:
- Pregunta solo una cosa cada vez.
- No presiones, no cierres la venta y no prometas resultados.
- No prometas bonificación FUNDAE.
- No des precios especiales.
- No digas que alguien está aceptado en el Programa Base.
- No llames a JetSelling® una plataforma de cursos.
- Si hay suficiente contexto, ready_for_handoff debe ser true y debes generar un resumen útil para Natalia.
- Si falta una pieza clave, ready_for_handoff debe ser false y tu reply debe hacer una única pregunta natural.
- Para particulares/profesionales individuales, cuando tengas contexto suficiente, recomienda solo 1 entrenamiento principal y, si procede, menciona 1 alternativa secundaria dentro del reply. No suenes a catálogo.
- No uses "producto recomendado" como copy. Usa "Entrenamiento recomendado", "Empezaría por aquí" o "Este sería el siguiente paso más lógico".

Rutas y datos clave:
- Individual: pregunta pocas cosas: qué vende, a quién vende y qué parte de la venta se le está haciendo más difícil ahora. Después diagnostica el bloqueo principal y recomienda un entrenamiento.
- Empresa: pregunta cuántas personas participarían, qué perfil tiene el equipo, qué objetivo quieren trabajar, modalidad preferida y si quieren revisar FUNDAE. Según el caso, puede encajar en empresa o workshop.
- FUNDAE: explica que la posible bonificación se revisa caso a caso, no está garantizada y que, si JetSelling® gestiona la tramitación, ese servicio tiene un coste adicional.
- Soporte campus: pide nombre, email usado en el campus, entrenamiento al que intenta acceder y captura/error.
- No encaja ahora: úsalo con respeto si la solicitud está fuera del alcance de JetSelling® o no hay una necesidad de ventas/formación/soporte relacionada.

Catálogo base para particulares:
- Prospección Comercial B2B: úsalo si el bloqueo es abrir conversaciones, prospectar, saber a quién contactar, mensajes sin respuesta o generar oportunidades. URL: https://www.jetselling.com/course/prospeccion-comercial-b2b-abrir-conversaciones-que-acaban-en-venta
- Negociación Comercial B2B: úsalo si el bloqueo es precio, comparación con competencia, defender valor, ceder demasiado, negociaciones atascadas o cerrar acuerdos con más estructura. URL: https://www.jetselling.com/negociacion-comercial-b2b-preparacion-cierre-acuerdo
- Catálogo de entrenamientos de ventas B2B: úsalo si no tiene claro el bloqueo o quiere comparar opciones. URL: https://www.jetselling.com/cursos-online-ventas-b2b
- Programa Base JetSelling®: úsalo si no es una habilidad aislada sino falta de estructura general: improvisa, no tiene método, falla en varias partes, necesita una ruta completa o quiere entrenar conversación comercial de forma más profunda. URL: https://www.jetselling.com/home#programa-base-jetselling

Para recommended_product:
- show true solo cuando recomiendes un entrenamiento/catálogo concreto o una opción de soporte accionable.
- type debe ser kit para Prospección o Negociación, programa_base para Programa Base, catalogo para el catálogo, soporte para soporte campus o none si no aplica.
- cta_label debe ser "Ver entrenamiento recomendado" cuando show sea true para recomendaciones a particulares.

Devuelve SIEMPRE y SOLO JSON válido con esta estructura exacta:
{
  "reply": "mensaje del asistente en español",
  "lead_type": "individual | empresa | kit | programa_base | workshop | soporte | no_encaja | unknown",
  "ready_for_handoff": true,
  "recommended_next_step": "recomendación breve en español",
  "whatsapp_summary": "texto listo para enviar a Natalia por WhatsApp",
  "recommended_product": {
    "show": true,
    "name": "nombre del entrenamiento recomendado",
    "type": "kit | programa_base | catalogo | soporte | none",
    "reason": "por qué encaja",
    "url": "url del entrenamiento o catálogo",
    "cta_label": "texto del botón"
  }
}`;

function fallbackPayload(reply = 'Gracias. Para orientarte bien sin darte una respuesta genérica, ¿me cuentas un poco más qué necesitas ahora mismo?'): AssistantPayload {
  return {
    reply,
    lead_type: 'unknown',
    ready_for_handoff: false,
    recommended_next_step: 'Seguir aclarando el caso antes de derivarlo a Natalia.',
    whatsapp_summary: 'Solicitud pendiente de completar: la persona necesita aclarar mejor su caso con JetSelling®.',
    recommended_product: {
      show: false,
      name: '',
      type: 'none',
      reason: '',
      url: '',
      cta_label: '',
    },
  };
}

function sanitizePayload(payload: Partial<AssistantPayload>): AssistantPayload {
  const safeLeadType = leadTypes.includes(payload.lead_type as LeadType) ? (payload.lead_type as LeadType) : 'unknown';
  const product = payload.recommended_product || fallbackPayload().recommended_product;
  const safeProductType = productTypes.includes(product.type as RecommendedProduct['type'])
    ? (product.type as RecommendedProduct['type'])
    : 'none';
  const productName = typeof product.name === 'string' ? product.name.trim() : '';
  const productReason = typeof product.reason === 'string' ? product.reason.trim() : '';
  const productUrl = typeof product.url === 'string' ? product.url.trim() : '';
  const shouldShowProduct = Boolean(product.show && productName && productReason && productUrl);

  return {
    reply: typeof payload.reply === 'string' && payload.reply.trim() ? payload.reply.trim() : fallbackPayload().reply,
    lead_type: safeLeadType,
    ready_for_handoff: Boolean(payload.ready_for_handoff),
    recommended_next_step:
      typeof payload.recommended_next_step === 'string' && payload.recommended_next_step.trim()
        ? payload.recommended_next_step.trim()
        : 'Revisar el resumen y decidir el siguiente paso con Natalia.',
    whatsapp_summary:
      typeof payload.whatsapp_summary === 'string' && payload.whatsapp_summary.trim()
        ? payload.whatsapp_summary.trim()
        : 'Solicitud recibida desde el asistente de JetSelling® pendiente de completar.',
    recommended_product: {
      show: shouldShowProduct,
      name: productName,
      type: shouldShowProduct ? safeProductType : 'none',
      reason: productReason,
      url: productUrl,
      cta_label: typeof product.cta_label === 'string' && product.cta_label.trim() ? product.cta_label.trim() : 'Ver entrenamiento recomendado',
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { messages?: IncomingMessage[] };
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const safeMessages = messages
      .filter((message) => (message.role === 'assistant' || message.role === 'user') && typeof message.content === 'string')
      .slice(-20);

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(fallbackPayload('Ahora mismo no puedo completar la orientación automática. Si quieres, deja aquí una frase con tu caso y podrás compartirla con Natalia por WhatsApp.'), { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      temperature: 0.35,
      messages: [
        { role: 'system', content: systemPrompt },
        ...safeMessages.map((message) => ({ role: message.role, content: message.content }) as const),
      ],
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content) as Partial<AssistantPayload>;
    const payload = sanitizePayload(parsed);
    const whatsappNumber = (process.env.WHATSAPP_NUMBER || '').replace(/[^\d]/g, '');
    const whatsappUrl = whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(payload.whatsapp_summary)}`
      : `https://wa.me/?text=${encodeURIComponent(payload.whatsapp_summary)}`;

    return NextResponse.json({ ...payload, whatsapp_url: whatsappUrl });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(fallbackPayload('Perdona, no he podido procesar la respuesta. ¿Me lo puedes reformular en una frase?'), { status: 500 });
  }
}
