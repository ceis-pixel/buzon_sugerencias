# Cierre del Sprint 3 — Modelo de datos y automatización

## Entregables del repositorio

| Issue | Migración | Resultado |
| --- | --- | --- |
| 3.1 | `20260922000001_create_suggestions_table.sql` | `suggestions`, enums `shift_type`, `suggestion_category`, `ticket_status`, restricciones, índices y RLS de inserción |
| 3.2 | `20260922000002_create_admins_table.sql` | Lista institucional `admins`, `is_admin()` y políticas de lectura |
| 3.3 | `20260922000003_create_ticket_responses_table.sql` | Respuestas públicas, notas internas, claves foráneas y políticas de moderación |
| 3.4 | `20260922000004_create_storage_bucket.sql` | Bucket público `suggestion-media`, límite de 1 048 576 bytes, JPEG/PNG/WebP y políticas |
| 3.5 | `20260922000005_create_ticket_code_generator.sql` | Generador `UNSCH-XXXX` con alfabeto sin caracteres ambiguos |
| 3.6 | `20260922000006_create_suggestions_triggers.sql` | Generación automática, estado inicial obligatorio y marcas temporales |

Los entregables están integrados en código y verificados localmente. Este cierre no representa una aplicación de migraciones a Supabase remoto ni un despliegue de producción.

## Contrato de inserción

El cliente web debe enviar únicamente campos del usuario:

```ts
import type { NewSuggestion } from "@/types/database.types";

const payload = {
  shift: "lunch",
  category: "service",
  message: "Propongo mejorar la organización de la fila.",
} satisfies NewSuggestion;

await supabase.from("suggestions").insert(payload);
```

`SuggestionInsert` conserva `ticket_code?`, `status?`, `created_at?` y `updated_at?`, como exige el contrato SQL. `NewSuggestion` limita las solicitudes del navegador a `shift`, `category`, `message` y `photo_url?`. Es una ayuda de TypeScript; las garantías reales las aplica PostgreSQL.

- Un código omitido, nulo o vacío se genera automáticamente. Un código explícito no vacío se conserva y la restricción UNIQUE rechaza duplicados.
- Toda inserción termina con `pending`, incluso si el cliente proporciona `resolved` o `in_review`. El ejemplo que solo comprobaba `IS NULL` no garantizaba esta regla.
- `created_at` conserva una fecha explícita; si falta o es nula, usa `now()`. `updated_at` siempre usa `now()`. Cuando ambas se omiten, son iguales.
- `BEFORE UPDATE` actualiza `updated_at` sin reinicializar el estado. La migración elimina el trigger anterior para que no se ejecute dos veces.
- No se reclasifican tickets existentes ni se cambian sus códigos. `Row.ticket_code` sigue siendo nullable porque las migraciones previas permitían valores nulos; no se declara un `NOT NULL` que el esquema no contiene.

Las columnas son `timestamptz`. `now()` representa un instante y PostgreSQL lo muestra en la zona horaria de la sesión. Convertirlo primero con `timezone('utc', now())` produce un valor sin zona que puede reinterpretarse erróneamente al asignarlo a `timestamptz`. Por eso también se corrigen los DEFAULT de `suggestions`. Véanse [tipos de fecha y hora](https://www.postgresql.org/docs/current/datatype-datetime.html) y [funciones temporales](https://www.postgresql.org/docs/current/functions-datetime.html). `now()` es estable por transacción; dos operaciones dentro de la misma transacción pueden compartir marca temporal.

## Generación y concurrencia

La migración 3.6 refuerza la función 3.5 sin reescribir el historial aplicado: sustituye `random()` por el primer byte aleatorio de UUID v4 nativo y rechaza bytes de 240 a 255 antes de mapear al alfabeto de 30 caracteres. La búsqueda está acotada a 50 candidatos y el error es legible en español. La función usa `search_path = pg_catalog` y referencia la tabla con su esquema explícito.

La generación y las inserciones con código explícito adquieren el mismo bloqueo transaccional por candidato. En READ COMMITTED esto coordina las inserciones que coinciden en un código; UNIQUE sigue siendo la garantía final. Invocar el generador como RPC no reserva permanentemente un código: debe usarse desde la inserción. Cambios manuales de código, transacciones con snapshots anteriores o interbloqueos pueden requerir reintentar la transacción completa (`23505`, `40001`, `40P01`). No se afirma haber ejecutado una prueba con varias conexiones concurrentes: PGlite usa una sola conexión.

Los cuatro caracteres ofrecen 30^4 = 810 000 combinaciones. El código es un identificador de seguimiento, no una credencial de autorización; los próximos flujos deberán controlar el acceso y la enumeración.

## Validación ejecutada

- `npm run test`: 120 pruebas aprobadas en 13 archivos, incluidas 17 de integración SQL.
- Pruebas SQL de las seis migraciones, limpieza del registro de prueba, reejecución de 3.6, códigos nulos/vacíos, estado manipulado, fechas en UTC/Lima/Tokio, creación explícita, actualización, duplicados e inserción múltiple de 128 filas.
- RLS real de PostgreSQL para inserción anónima, respuestas públicas frente a internas, admins activos/inactivos y operaciones de objetos de Storage.
- `npm run check-all`: TypeScript, ESLint con cero advertencias y build Next.js aprobados. Se usan valores públicos de ejemplo; no se necesita la clave administrativa.

Las pruebas utilizan PostgreSQL en memoria con PGlite. `tests/fixtures/supabase-bootstrap.sql` proporciona roles, claims y tablas mínimas de Storage únicamente para pruebas: nunca debe aplicarse en Supabase. La configuración del bucket se valida por SQL; la aplicación del límite de archivos por Storage HTTP y la autenticación real no están incluidas.

## Aplicación y continuidad

Aplicar las migraciones mediante el procedimiento de Supabase del proyecto, respetando el orden 1–6 y el historial existente. La migración 3.6 incluye una transacción y una prueba `DO` que inserta solo `shift`, `category`, `message`, valida código/estado/fechas y elimina únicamente su propio registro. Si falla, revierte la migración.

Para el Sprint 4 siguen pendientes la autenticación institucional y su validación de dominio, la disociación anónima, los permisos de consulta/moderación de sugerencias y los endpoints de negocio. La inserción actual de sugerencias es pública y la subida a Storage admite a cualquier usuario autenticado: la política existente aún no verifica el dominio institucional. El bucket es público por diseño y las respuestas no internas tienen lectura pública. Estos son límites del modelo actual, no controles ya implementados.
