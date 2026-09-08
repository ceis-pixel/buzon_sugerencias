import Link from "next/link";

export function NotFoundMessage() {
  return (
    <section aria-labelledby="not-found-title" className="max-w-xl">
      <p className="mb-4 text-sm font-semibold text-brand-900">Error 404</p>
      <h1
        id="not-found-title"
        className="text-3xl font-bold tracking-tight sm:text-4xl"
      >
        Página no encontrada
      </h1>
      <p className="mt-4 leading-7 text-stone-600">
        La página que buscas no existe o ha cambiado de dirección.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-lg bg-brand-900 px-5 py-3 font-semibold text-white hover:bg-brand-700"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
