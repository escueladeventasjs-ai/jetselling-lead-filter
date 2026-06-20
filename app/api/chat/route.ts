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

const PRODUCT_URLS = {
  prospeccion: 'https://www.jetselling.com/course/prospeccion-comercial-b2b-abrir-conversaciones-que-acaban-en-venta',
  negociacion: 'https://www.jetselling.com/course/negociacion-comercial-b2b-preparacion-cierre-acuerdo',
  catalogo: 'https://www.jetselling.com/cursos-online-ventas-b2b',
  programaBase: 'https://www.jetselling.com/home#programa-base-jetselling',
  soporte: 'mailto:soporte@jetselling.com',
} as const;

const systemPrompt = `Eres el asistente de diagnóstico rápido de JetSelling®.

Hablas SIEMPRE en español de España, con tono natural, humano, cálido, claro y profesional. Suenas como alguien del equipo JetSelling®, no como un formulario ni como un bot genérico. Eres directo, útil y sobrio.

Objetivo: entender qué se le atasca a la persona y orientarla hacia una de estas rutas: Kit de Ventas B2B, Programa Base JetSelling®, entrenamiento para empresa, workshop a medida, soporte campus o no encaja ahora.

Reglas de conversación:
- Pregunta solo una cosa cada vez.
- No presiones, no cierres la venta y no prometas resultados.
- No prometas bonificación FUNDAE.
- No des precios especiales.
- No digas que alguien está aceptado en el Programa Base.
- No llames a JetSelling® una plataforma de cursos.
- Evita sonar genérico. Usa el problema real de la persona: abrir conversaciones, precio, objeciones, reuniones que no avanzan, seguimiento, equipo sin forma común de vender o duda de campus.
- Si falta contexto, ready_for_handoff debe ser false y tu reply debe hacer una única pregunta natural.
- Si hay suficiente contexto, ready_for_handoff debe ser true, debes orientar con claridad y generar un resumen útil para Natalia.
- Para particulares/profesionales individuales, cuando tengas contexto suficiente, recomienda solo 1 entrenamiento principal. No suenes a catálogo.
- No uses "producto recomendado". Usa "Entrenamiento recomendado", "Empezaría por aquí" o "Este sería el siguiente paso más lógico".

Rutas y criterios:
- Individual: pregunta qué vende, a quién vende y qué parte de la venta se le está haciendo más difícil ahora. Después diagnostica el bloqueo principal y recomienda un entrenamiento.
- Empresa: pregunta cuántas personas participarían, qué perfil tiene el equipo, qué objetivo quieren trabajar, modalidad preferida y si quieren revisar FUNDAE. Según el caso, puede encajar en empresa o workshop.
- FUNDAE: explica que la posible bonificación se revisa caso a caso, no está garantizada y que, si JetSelling® gestiona la tramitación, ese servicio tiene un coste adicional.
- Soporte campus: pide nombre, email usado en el campus, entrenamiento al que intenta acceder y captura/error.
- No encaja ahora: úsalo con respeto si la solicitud está fuera del alcance de JetSelling® o no hay una necesidad de ventas, entrenamiento o soporte relacionada.

Catálogo base para particulares:
- Prospección Comercial B2B: úsalo si el bloqueo es abrir conversaciones, prospectar, saber a quién contactar, mensajes sin respuesta, generar oportunidades o dejar de contactar por contactar. URL: ${PRODUCT_URLS.prospeccion}
- Negociación Comercial B2B: úsalo si el bloqueo es precio, competencia, objeciones, descuentos, defender valor, ceder demasiado, presión del comprador, condiciones o cierre de acuerdos. URL: ${PRODUCT_URLS.negociacion}
- Catálogo de entrenamientos de ventas B2B: úsalo si no tiene claro el bloqueo o quiere comparar opciones. URL: ${PRODUCT_URLS.catalogo}
- Programa Base JetSelling®: úsalo si no es una habilidad aislada sino falta de estructura general: improvisa, no tiene método, falla en varias partes, necesita una ruta completa o quiere entrenar su conversación comercial de forma más profunda. URL: ${PRODUCT_URLS.programaBase}

Ejemplos de respuesta esperada:
- Prospección: "Por lo que cuentas, ahora mismo el bloqueo está en abrir conversaciones con mejores oportunidades. Te recomendaría empezar por Prospección Comercial B2B. No va de enviar más mensajes, sino de preparar mejor a quién contactas, por qué tendría sentido hablar y qué primer paso quieres conseguir sin sonar como otro mensaje más."
- Negociación: "Por lo que cuentas, el problema no está solo en el precio. Está en llegar a la negociación con menos preparación de la que necesitas cuando el cliente presiona. Te recomendaría empezar por Negociación Comercial B2B. Trabajarás cómo preparar límites, defender valor, responder a comparativas y cerrar acuerdos sin ceder por reflejo."
- Programa Base: "Por lo que cuentas, no parece que necesites solo una técnica concreta. Parece que necesitas ordenar mejor toda tu forma de vender: cómo prospectas, cómo preparas reuniones, cómo explicas valor, cómo respondes objeciones y cómo cierras próximos pasos. En ese caso, el Programa Base JetSelling® puede tener más sentido que empezar por un entrenamiento aislado."
- Empresa: "Aquí no se trata solo de que una persona mejore. El reto parece estar en que el equipo tenga una forma más común de preparar reuniones, explicar valor, responder objeciones y avanzar oportunidades. En este caso tiene más sentido hablar con Natalia para revisar el contexto del equipo."

Para recommended_product:
- show true solo cuando recomiendes un entrenamiento, catálogo, Programa Base o soporte accionable.
- type debe ser kit para Prospección o Negociación, programa_base para Programa Base, catalogo para catálogo, soporte para soporte campus o none si no aplica.
- cta_label debe ser "Ver entrenamiento recomendado" cuando show sea true para recomendaciones a particulares.
- reason debe ser concreto y útil. Evita frases genéricas como "ayuda a mejorar tus habilidades".

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

function fallbackPayload(reply = 'Gracias. Para orientarte bien, dime qué necesitas ahora mismo: ¿abrir más conversaciones, negociar mejor, ordenar tus reuniones, entrenar a tu equipo o resolver una duda del campus?'): AssistantPayload {
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

function normalizeProductUrl(product: RecommendedProduct, safeProductType: RecommendedProduct['type']): string {
  const text = `${product.name || ''} ${product.reason || ''} ${product.url || ''}`.toLowerCase();

  if (safeProductType === 'programa_base' || text.includes('programa base')) return PRODUCT_URLS.programaBase;
  if (safeProductType === 'catalogo' || text.includes('catálogo') || text.includes('catalogo')) return PRODUCT_URLS.catalogo;
  if (safeProductType === 'soporte' || text.includes('soporte') || text.includes('campus')) return PRODUCT_URLS.soporte;

  if (
    text.includes('prospe') ||
    text.includes('abrir conversaciones') ||
    text.includes('contactar') ||
    text.includes('oportunidades') ||
    text.includes('mensajes sin respuesta')
  ) {
    return PRODUCT_URLS.prospeccion;
  }

  if (
    text.includes('negoci') ||
    text.includes('precio') ||
    text.includes('objec') ||
    text.includes('descuento') ||
    text.includes('competencia') ||
    text.includes('defender valor') ||
    text.includes('ceder') ||
    text.includes('condiciones')
  ) {
    return PRODUCT_URLS.negociacion;
  }

  return PRODUCT_URLS.catalogo;
}

function sanitizePayload(payload: Partial<AssistantPayload>): AssistantPayload {
  const safeLeadType = leadTypes.includes(payload.lead_type as LeadType) ? (payload.lead_type as LeadType) : 'unknown';
  const product = payload.recommended_product || fallbackPayload().recommended_product;
  const safeProductType = productTypes.includes(product.type as RecommendedProduct['type'])
    ? (product.type as RecommendedProduct['type'])
    : 'none';
  const productName = typeof product.name === 'string' ? product.name.trim() : '';
  const productReason = typeof product.reason === 'string' ? product.reason.trim() : '';
  const productUrl = normalizeProductUrl(product as RecommendedProduct, safeProductType);
  const shouldShowProduct = Boolean(product.show && productName && productReason && productUrl && safeProductType !== 'none');

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
      url: shouldShowProduct ? productUrl : '',
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
      return NextResponse.json(fallbackPayload('Ahora mismo no puedo completar la orientación automática. Deja aquí una frase con tu caso y podrás compartirla con Natalia por WhatsApp.'), { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      temperature: 0.25,
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
