import Link from "next/link";

export function NotFoundMessage() {
  return (
    <section aria-labelledby="not-found-title" className="max-w-xl">
      <p className="mb-4 text-sm font-semibold text-primary">Error 404</p>
      <h1
        id="not-found-title"
        className="text-3xl font-bold tracking-tight text-primary sm:text-4xl"
      >
        Página no encontrada
      </h1>
      <p className="mt-4 leading-7 text-neutral-gray">
        La página que buscas no existe o ha cambiado de dirección.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:opacity-95"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
