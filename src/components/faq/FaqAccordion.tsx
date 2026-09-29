"use client";

import { useState } from "react";
import {
  ChevronDown,
  Clock,
  FileQuestion,
  HelpCircle,
  KeyRound,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export interface FaqItem {
  id: string;
  icon: typeof HelpCircle;
  question: string;
  answer: string;
  details?: string[];
  category: "privacy" | "operation" | "tickets";
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "anonimato",
    icon: ShieldCheck,
    question: "¿Cómo se garantiza que mi sugerencia sea 100% anónima?",
    answer:
      "El sistema implementa una arquitectura disociativa estricta de conocimiento cero (Zero-Knowledge): aunque inicias sesión con tu correo institucional (@unsch.edu.pe) para certificar que eres un estudiante activo, tu correo NUNCA se vincula ni se almacena en la tabla de sugerencias.",
    details: [
      "El servidor genera un hash efímero SHA-256 diario combinado con una semilla criptográfica (salt) exclusiva para evitar el spam (máximo 2 reportes por turno).",
      "Ni los moderadores, ni los desarrolladores, ni las autoridades universitarias pueden rastrear qué alumno emitió una observación específica.",
      "La evidencia fotográfica es procesada sin metadatos EXIF de geolocalización o identificación de dispositivo.",
    ],
    category: "privacy",
  },
  {
    id: "quien-lee",
    icon: Users,
    question: "¿Quién lee y gestiona mis observaciones?",
    answer:
      "Tus reportes son recibidos de manera directa e imparcial por la Secretaría de Salud y Nutrición de la FUSCH (Federación Universitaria de San Cristóbal de Huamanga) y los comisionados estudiantiles de comedor.",
    details: [
      "La comisión clasifica y evalúa las incidencias para exigir correcciones inmediatas a los concesionarios y chefs de cocina.",
      "Las observaciones críticas de inocuidad o salubridad disparan alertas de emergencia a los canales privados de fiscalización.",
      "Periódicamente se presentan informes técnicos sustentados ante la Dirección de Bienestar Universitario de la UNSCH.",
    ],
    category: "operation",
  },
  {
    id: "codigo-extraviado",
    icon: KeyRound,
    question: "¿Qué hago si extravié mi código de ticket (UNSCH-XXXX)?",
    answer:
      "Debido al principio estricto de disociación y anonimato, el sistema NO puede recuperar un ticket buscando tu nombre o correo institucional, ya que esa relación nunca existió en la base de datos.",
    details: [
      "Si enviaste la sugerencia desde el mismo navegador o celular, revisa el historial local en el módulo de seguimiento: tu dispositivo guarda los últimos 10 tickets enviados.",
      "Al enviar una nueva sugerencia, te recomendamos anotar el código generado o tomar una captura de pantalla a la tarjeta de confirmación.",
      "Las mejoras adoptadas que impactan a toda la comunidad son publicadas de forma abierta en el Mural de Transparencia Pública.",
    ],
    category: "tickets",
  },
  {
    id: "horarios-turnos",
    icon: Clock,
    question: "¿Cuáles son los horarios de atención de cada turno del comedor?",
    answer:
      "El comedor universitario atiende en tres turnos diarios de lunes a viernes durante el calendario académico regular:",
    details: [
      "Turno Desayuno: 07:00 a 08:30 hrs.",
      "Turno Almuerzo: 11:30 a 14:00 hrs.",
      "Turno Cena: 17:30 a 19:30 hrs.",
      "El buzón permite seleccionar el turno exacto sobre el cual deseas emitir tu observación, inclusive si estás enviando el reporte unas horas después.",
    ],
    category: "operation",
  },
  {
    id: "tiempo-respuesta",
    icon: Clock,
    question: "¿En cuánto tiempo se da respuesta a los reportes?",
    answer:
      "El equipo de moderación de la FUSCH revisa el buzón de forma continua:",
    details: [
      "Casos Críticos de Higiene o Inocuidad: Se canalizan inmediatamente para su inspección en el mismo servicio del turno.",
      "Sugerencias de Menú, Porción y Atención: Se evalúan dentro de un plazo de 24 a 72 horas hábiles.",
      "Una vez registrada la medida de solución, podrás leer la respuesta oficial en la sección 'Seguimiento de Tickets' ingresando tu código.",
    ],
    category: "operation",
  },
];

export function FaqAccordion() {
  const [openIds, setOpenIds] = useState<string[]>(["anonimato"]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q) ||
      item.details?.some((d) => d.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Search Input for FAQs */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-gray">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar una duda o palabra clave (ej. anonimato, turnos, ticket)…"
          className="block w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-neutral-gray shadow-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Accordion list */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-neutral-gray">
            <FileQuestion className="mx-auto h-8 w-8 text-secondary/60 mb-2" />
            <p>No se encontraron respuestas para &ldquo;{searchQuery}&rdquo;.</p>
            <p className="text-xs text-neutral-gray/80 mt-1">
              Prueba con términos como anonimato, código, turno o respuesta.
            </p>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            const Icon = faq.icon;

            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs transition-colors hover:border-gray-300"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                  className="flex w-full items-center justify-between gap-4 p-4 sm:p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-sans text-sm sm:text-base font-bold text-gray-900 leading-snug">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-neutral-gray transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${faq.id}`}
                    role="region"
                    className="border-t border-gray-100 bg-slate-50/50 px-4 py-4 sm:px-5 sm:py-5 text-xs sm:text-sm text-gray-700 leading-relaxed space-y-3"
                  >
                    <p>{faq.answer}</p>
                    {faq.details && faq.details.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                        {faq.details.map((detail, idx) => (
                          <li key={idx}>{detail}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Trust & Transparency Guarantee Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-neutral-gray flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <strong className="block text-primary font-bold">
            Compromiso Institucional con la Comunidad UNSCH
          </strong>
          <span>
            Este canal fue diseñado con el objetivo de elevar continuamente la calidad de la
            alimentación de todos los comensales universitarios, garantizando siempre la libre
            expresión de los estudiantes.
          </span>
        </div>
      </div>
    </div>
  );
}
