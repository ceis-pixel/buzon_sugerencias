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
    <section aria-labelledby="typography-title">
      <header className="rounded-2xl border border-neutral-gray/20 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-widest text-secondary">
          Sistema de diseño Crimson Heritage · Manrope
        </p>
        <h1
          id="typography-title"
          className="mt-4 text-2xl md:text-3xl font-bold text-primary"
        >
          Buzón de Sugerencias
        </h1>
        <h2 className="mt-4 text-lg font-semibold text-secondary">
          Tu opinión mejora el comedor universitario
        </h2>
        <p className="mt-3 max-w-2xl text-base font-normal text-neutral-gray">
          Comparte tus sugerencias y observaciones sobre el servicio del comedor.
          Tu participación nos ayuda a mejorar la atención a nuestra comunidad
          universitaria.
        </p>
        <p className="mt-4 text-sm font-medium text-neutral-gray">
          Comedor Universitario UNSCH · Ayacucho, Perú.
        </p>
      </header>

      <h2 id="palette-title" className="mt-10 text-xl font-semibold text-primary">
        Paleta institucional
      </h2>

      <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {colorTokens.map((token) => (
          <article
            key={token.name}
            aria-labelledby={`color-${token.name}`}
            className="overflow-hidden rounded-2xl border border-neutral-gray/20 bg-white shadow-sm"
          >
            <div aria-hidden="true" className={`h-32 ${token.swatchClass}`} />
            <div className="p-5">
              <h3
                id={`color-${token.name}`}
                className="text-lg font-semibold text-primary"
              >
                {token.label}
              </h3>
              <p className="mt-2 text-sm font-medium text-primary">
                {token.name}
              </p>
              <p className="mt-1 text-sm font-medium text-primary">{token.hex}</p>
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
