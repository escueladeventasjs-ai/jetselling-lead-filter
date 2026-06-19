'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type Role = 'assistant' | 'user';
type ChatMessage = { role: Role; content: string };
type RecommendedProduct = {
  show: boolean;
  name: string;
  type: 'kit' | 'programa_base' | 'catalogo' | 'soporte' | 'none';
  reason: string;
  url: string;
  cta_label: string;
};

type ChatResponse = {
  reply: string;
  lead_type: 'individual' | 'empresa' | 'kit' | 'programa_base' | 'workshop' | 'soporte' | 'no_encaja' | 'unknown';
  ready_for_handoff: boolean;
  recommended_next_step: string;
  whatsapp_summary: string;
  recommended_product?: RecommendedProduct;
  whatsapp_url?: string;
};

const INITIAL_MESSAGE =
  'Hola, soy el asistente de JetSelling®. Para no darte una respuesta genérica, dime primero: ¿buscas algo para ti, para tu equipo o necesitas ayuda con el campus?';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: INITIAL_MESSAGE }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, lastResponse]);

  const whatsappHref = useMemo(() => {
    if (!lastResponse?.whatsapp_summary) return '';
    return lastResponse.whatsapp_url || `https://wa.me/?text=${encodeURIComponent(lastResponse.whatsapp_summary)}`;
  }, [lastResponse]);

  const shouldShowRecommendation = Boolean(
    lastResponse?.recommended_product?.show &&
      lastResponse.recommended_product.name &&
      lastResponse.recommended_product.reason &&
      lastResponse.recommended_product.url,
  );

  async function submitMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmedInput }];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) {
        throw new Error('No se ha podido responder ahora mismo. Inténtalo de nuevo en unos segundos.');
      }

      const data = (await response.json()) as ChatResponse;
      setLastResponse(data);
      setMessages((current) => [...current, { role: 'assistant', content: data.reply }]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Ha ocurrido un error inesperado.');
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  }

  function continueClarifying() {
    setLastResponse((current) => (current ? { ...current, ready_for_handoff: false } : current));
    setInput('Me gustaría aclarar un poco más mi caso: ');
  }

  return (
    <main className="main-shell">
      <section className="chat-card" aria-label="Asistente de prediagnóstico JetSelling">
        <header className="hero">
          <div className="brand"><span className="brand-dot" />JetSelling®</div>
          <h1>Te ayudamos a encontrar el siguiente paso</h1>
          <p className="subtitle">
            Responde unas preguntas rápidas y vemos si tiene más sentido un Kit, el Programa Base, una propuesta para empresa, un workshop o soporte.
          </p>
        </header>

        <div className="messages" aria-live="polite">
          {messages.map((message, index) => (
            <div className={`bubble-row ${message.role}`} key={`${message.role}-${index}`}>
              <div className="bubble">{message.content}</div>
            </div>
          ))}
          {isLoading ? (
            <div className="bubble-row assistant"><div className="bubble">Estoy revisando tu caso con calma…</div></div>
          ) : null}
          {shouldShowRecommendation && lastResponse?.recommended_product ? (
            <div className="recommendation-card">
              <p className="recommendation-kicker">Entrenamiento recomendado</p>
              <h2>{lastResponse.recommended_product.name}</h2>
              <p>{lastResponse.recommended_product.reason}</p>
              <div className="actions">
                <a className="primary-button" href={lastResponse.recommended_product.url} target="_blank" rel="noreferrer">
                  Ver entrenamiento recomendado
                </a>
                <a className="secondary-button" href={whatsappHref} target="_blank" rel="noreferrer">
                  Contactar con Natalia por WhatsApp
                </a>
              </div>
            </div>
          ) : null}
          {lastResponse?.ready_for_handoff && !shouldShowRecommendation ? (
            <div className="handoff-panel">
              <p>{lastResponse.recommended_next_step}</p>
              <div className="actions">
                <a className="primary-button" href={whatsappHref} target="_blank" rel="noreferrer">
                  Contactar con Natalia por WhatsApp
                </a>
                <button className="secondary-button" type="button" onClick={continueClarifying}>
                  Seguir aclarando mi caso
                </button>
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        {error ? <p className="error" role="alert">{error}</p> : null}

        <form className="composer" onSubmit={submitMessage}>
          <textarea
            className="input"
            placeholder="Escribe aquí tu respuesta…"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void submitMessage();
              }
            }}
            disabled={isLoading}
          />
          <button className="send-button" type="submit" disabled={isLoading || !input.trim()}>
            Enviar
          </button>
        </form>
      </section>
    </main>
  );
}
