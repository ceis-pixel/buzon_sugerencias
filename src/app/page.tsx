const colorTokens = [
  {
    name: "primary",
    label: "Crimson Profundo",
    hex: "#5C0000",
    description:
      "Estados activos, botones principales, encabezados y enlaces críticos.",
    swatchClass: "bg-primary",
  },
  {
    name: "secondary",
    label: "Crimson Mitigado",
    hex: "#A6665C",
    description:
      "Bordes secundarios, etiquetas de condición y subtítulos.",
    swatchClass: "bg-secondary",
  },
  {
    name: "tertiary",
    label: "Azul Técnico",
    hex: "#001586",
    description:
      "Alertas del sistema, notificaciones urgentes y etiquetas destacadas.",
    swatchClass: "bg-tertiary",
  },
  {
    name: "neutral-gray",
    label: "Gris Estructural",
    hex: "#847370",
    description: "Textos, fondos secundarios y bordes neutros.",
    swatchClass: "bg-neutral-gray",
  },
] as const;

export default function HomePage() {
  return (
    <section aria-labelledby="palette-title">
      <p className="text-sm font-semibold uppercase tracking-widest text-secondary">
        Sistema de diseño Crimson Heritage
      </p>
      <h1
        id="palette-title"
        className="mt-3 text-balance text-4xl font-bold tracking-tight text-primary sm:text-5xl"
      >
        Paleta institucional
      </h1>
      <p className="mt-4 max-w-2xl text-pretty leading-7">
        Vista de comprobación de los colores y componentes del Buzón de
        Sugerencias del Comedor UNSCH.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {colorTokens.map((token) => (
          <article
            key={token.name}
            aria-labelledby={`color-${token.name}`}
            className="overflow-hidden rounded-2xl border border-neutral-gray/20 bg-white shadow-sm"
          >
            <div aria-hidden="true" className={`h-32 ${token.swatchClass}`} />
            <div className="p-5">
              <h2
                id={`color-${token.name}`}
                className="text-lg font-semibold text-primary"
              >
                {token.label}
              </h2>
              <p className="mt-2 font-mono text-sm text-primary">
                {token.name}
              </p>
              <p className="mt-1 font-mono text-sm text-primary">{token.hex}</p>
              <p className="mt-4 text-sm leading-6">{token.description}</p>
            </div>
          </article>
        ))}
      </div>

      <section
        aria-labelledby="components-title"
        className="mt-10 border-t border-neutral-gray/20 pt-8"
      >
        <h2 id="components-title" className="text-xl font-semibold text-primary">
          Componentes de prueba
        </h2>
        <p className="mt-2 leading-7">
          Botón principal e insignia informativa para comprobar la paleta y las
          transparencias.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="bg-primary text-white hover:opacity-95 rounded-xl px-4 py-2"
          >
            Botón de prueba
          </button>
          <span className="bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-xl px-3 py-1">
            Aviso informativo
          </span>
        </div>
      </section>
    </section>
  );
}
