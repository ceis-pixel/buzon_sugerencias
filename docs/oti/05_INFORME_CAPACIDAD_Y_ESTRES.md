# Informe de Capacidad y Prueba de Estrés

**Sistema:** Buzón de Sugerencias — Comedor Universitario UNSCH
**Versión:** v1.0.0-onpremise
**Destinatarios:** Jefatura e Infraestructura de la OTI
**Fecha de las mediciones:** 6 de octubre de 2026

---

## 1. Conclusiones

| Pregunta | Respuesta |
| --- | --- |
| ¿Puede operar con menos de 0.5 núcleos y 1 GB de RAM? | Sí. Limitado a **0.50 núcleos y 832 MB** atendió 31.6 peticiones/s sin errores, usando 0.39 núcleos y 304 MB |
| ¿Soporta la hora punta del comedor? | Sí. La demanda máxima estimada es de 5 peticiones/s; la capacidad medida con medio núcleo es **6 veces mayor** |
| ¿Cuánto disco consume en un año? | Entre **0.3 y 1.5 GB** de datos según la adopción, más 0.9 GB de imágenes de Docker y los respaldos de 7 días |
| ¿Puede compartir una máquina virtual con otros servicios? | Sí. En reposo no consume CPU y ocupa entre 100 y 170 MB de memoria |

Las cifras de demanda son estimaciones basadas en supuestos explícitos
(sección 2). Las cifras de consumo y rendimiento son mediciones reales, con
las limitaciones indicadas en la sección 7.

---

## 2. Estimación de la demanda

### 2.1 Supuestos

| Supuesto | Valor | Origen |
| --- | --- | --- |
| Comensales por día | 1 500 | Dato del requerimiento |
| Reparto por turno | Almuerzo 60 % (900), desayuno 20 %, cena 20 % | Supuesto |
| Ventana punta | 11:30 a 14:00 (150 minutos) | Dato del requerimiento |
| Concentración | El 25 % de las visitas del almuerzo ocurre en los 15 minutos más cargados | Supuesto conservador |
| Peticiones por visita | 20 (página, recursos estáticos, menú del día, calificación y, a veces, una sugerencia) | Conteo del flujo de la aplicación |
| Días de atención al año | 220 | Supuesto |

Los valores marcados como supuesto deben ajustarse con datos reales del
comedor tras el primer mes de operación.

### 2.2 Concurrencia en la hora punta

| Escenario | Comensales que usan el sistema en el almuerzo | Promedio en la ventana | Pico de 15 minutos |
| --- | --- | --- | --- |
| Esperado (30 % de adopción) | 270 | 0.6 peticiones/s | 1.5 peticiones/s |
| Alto (100 % de adopción) | 900 | 2.0 peticiones/s | **5.0 peticiones/s** |

Cálculo del escenario alto: 900 × 25 % = 225 visitas en 900 segundos, por 20
peticiones cada una, igual a 5 peticiones por segundo.

Escrituras en ese pico: 225 calificaciones y unas 25 sugerencias en 15
minutos, es decir, **0.3 transacciones por segundo**.

El escenario alto es un techo teórico: supone que todos los comensales del
almuerzo escanean el código QR y califican el menú.

---

## 3. Consumo de recursos medido

### 3.1 Entorno de prueba

| Elemento | Detalle |
| --- | --- |
| Equipo | Portátil con Intel Core i5-12450H, Windows 11 |
| Motor | Docker Desktop 29.0 sobre WSL2 (12 CPU lógicas, 7.6 GB asignados) |
| Stack | `proxy` + `app` + `db`, perfil `production`, imagen `v1.0.0-onpremise` |
| Entrada | Todas las peticiones pasan por el Nginx del stack (`http://localhost`) |
| Límites | Aplicados con `docker update`: `app` 0.35 CPU / 512 MB, `db` 0.10 CPU / 256 MB, `proxy` 0.05 CPU / 64 MB. **Total: 0.50 CPU y 832 MB** |

### 3.2 En reposo

| Contenedor | CPU | Memoria |
| --- | --- | --- |
| `app` | 0 % | 46 a 57 MB |
| `db` | 0 a 3 % | 33 a 115 MB (crece con la caché tras el uso) |
| `proxy` | 0 % | 10 a 11 MB |
| **Total** | **≈ 0** | **100 a 170 MB** |

### 3.3 Bajo carga, con el límite de 0.5 núcleos

Carga de 60 segundos con 10 clientes simultáneos sin pausa entre peticiones.

| Contenedor | CPU promedio | CPU pico | Memoria pico |
| --- | --- | --- | --- |
| `app` | 0.35 núcleos (en su límite) | 0.37 | 153 MB |
| `db` | 0.02 | 0.03 | 139 MB |
| `proxy` | 0.02 | 0.03 | 12 MB |
| **Total** | **0.39 núcleos** | — | **304 MB** |

El contenedor `app` es el único que alcanza su límite: el rendimiento del
sistema depende de la CPU asignada a la aplicación, no de la base de datos.

---

## 4. Prueba de estrés

### 4.1 Composición de la carga

Mezcla ponderada que imita el uso en hora punta, con mayor proporción de
operaciones costosas que el uso real (no incluye recursos estáticos, que son
las peticiones más baratas, y el 15 % son escrituras).

| Operación | Peso | Toca la base |
| --- | --- | --- |
| Página principal con el formulario | 30 % | No |
| Menú del día y promedio de calificaciones | 13 % | Lectura |
| Consulta de ticket por código | 12 % | Lectura |
| Página de seguimiento | 10 % | No |
| Mural de transparencia | 10 % | Lectura |
| Descarga de una fotografía de 120 KB | 10 % | No |
| Calificar el menú (sesión de estudiante) | 8 % | Transacción |
| Enviar una sugerencia (sesión de estudiante) | 7 % | Transacción |

Las escrituras usaron 4 000 sesiones de estudiantes distintas, para respetar
los cupos por turno y ejercitar la ruta completa: validación de sesión,
cálculo del hash, control de cupo e inserción.

### 4.2 Resultados

| Indicador | Con límite de 0.5 núcleos | Sin límite |
| --- | --- | --- |
| Clientes simultáneos | 10 | 20 |
| Duración | 60 s | 20 s |
| Peticiones atendidas | 1 903 | 3 508 |
| **Rendimiento** | **31.6 peticiones/s** | 175 peticiones/s |
| Errores | 0 | 0 |
| Latencia mediana | 234 ms | 85 ms |
| Latencia percentil 95 | 788 ms | 309 ms |
| Latencia máxima | 1 289 ms | 943 ms |

Detalle por operación con el límite de 0.5 núcleos:

| Operación | Peticiones | Mediana | Percentil 95 |
| --- | --- | --- | --- |
| Página principal | 573 | 212 ms | 729 ms |
| Menú del día | 249 | 212 ms | 601 ms |
| Consulta de ticket | 244 | 205 ms | 619 ms |
| Página de seguimiento | 186 | 103 ms | 298 ms |
| Mural de transparencia | 203 | 380 ms | 711 ms |
| Fotografía de 120 KB | 183 | 190 ms | 481 ms |
| Calificar el menú | 143 | 701 ms | 1 182 ms |
| Enviar una sugerencia | 122 | 393 ms | 776 ms |

En la corrida sin límite, 29 calificaciones recibieron la respuesta «ya
registraste tu opinión» porque el conjunto de sesiones de prueba era menor y
se repitieron estudiantes; es el comportamiento esperado del cupo, no un fallo.

### 4.3 Interpretación

| Comparación | Demanda | Capacidad medida (0.5 núcleos) | Margen |
| --- | --- | --- | --- |
| Peticiones por segundo, escenario alto | 5.0 | 31.6 | 6 veces |
| Peticiones por segundo, escenario esperado | 1.5 | 31.6 | 21 veces |
| Transacciones de escritura por segundo | 0.3 | 4.4 | 15 veces |

Las latencias de la tabla corresponden a un sistema saturado a propósito (10
clientes sin pausa contra medio núcleo). Con la demanda real, muy inferior, el
tiempo de respuesta se aproxima al de la columna «sin límite».

Con 1 vCPU, que es la asignación recomendada, el margen se duplica
aproximadamente.

---

## 5. Proyección de almacenamiento a un año

### 5.1 Tamaño medido por registro

Medido en PostgreSQL 16 con datos sintéticos (20 000 sugerencias con mensajes
de 120 a 320 caracteres, 10 000 respuestas, 300 000 calificaciones),
incluyendo índices.

| Tabla | Bytes por fila |
| --- | --- |
| `suggestions` | 473 |
| `ticket_responses` | 460 |
| `menu_ratings` | 140 |
| `daily_menus` | 426 |
| `submission_rate_limits`, `menu_rating_limits` | 455 (se eliminan a las 48 h) |

Base recién inicializada: 8.2 MB. Directorio de datos de PostgreSQL recién
creado: 63 MB (incluye catálogo y registro de transacciones).

### 5.2 Base de datos

| Concepto | Escenario esperado | Escenario alto |
| --- | --- | --- |
| Calificaciones por día | 450 (30 %) | 1 500 (100 %) |
| Sugerencias por día | 45 (3 %) | 150 (10 %) |
| Calificaciones al año | 99 000 → 13.9 MB | 330 000 → 46.2 MB |
| Sugerencias al año | 9 900 → 4.7 MB | 33 000 → 15.6 MB |
| Respuestas oficiales (una por sugerencia) | 4.6 MB | 15.2 MB |
| Menús (3 por día) | 0.3 MB | 0.3 MB |
| Cupos efímeros (2 días) | 0.5 MB | 1.5 MB |
| Base inicial | 8.2 MB | 8.2 MB |
| **Datos en la base** | **≈ 32 MB** | **≈ 87 MB** |
| **Directorio de datos en disco** | **≈ 90 MB** | **≈ 145 MB** |

La cifra de referencia de **~150 MB anuales** corresponde, por tanto, al techo
del escenario alto en disco. El crecimiento es lineal.

### 5.3 Fotografías

Cada fotografía se comprime en el navegador (Canvas API, 1200 px, WebP) a unos
120 KB; el servidor rechaza archivos de más de 500 KB.

| Concepto | Escenario esperado | Escenario alto |
| --- | --- | --- |
| Sugerencias con fotografía | 15 % | 30 % |
| Fotografías al año | 1 485 | 9 900 |
| **Volumen bruto anual** | **≈ 180 MB** | **≈ 1.2 GB** |
| Volumen estable con la purga de 90 días | ≈ 50 MB | ≈ 330 MB |

El volumen estable supone que los casos se resuelven en pocos días: la purga
solo elimina las fotografías de tickets **resueltos** con más de 90 días. Las
de tickets sin resolver se conservan indefinidamente.

Sin la compresión en el navegador, una fotografía de teléfono ocupa entre 3 y
5 MB: el mismo escenario esperado requeriría entre 4 y 7 GB al año.

### 5.4 Respaldos

El respaldo diario contiene un volcado comprimido de la base y una **copia
completa** del volumen de fotografías (no es incremental). Se conservan 7.

| Concepto | Escenario esperado | Escenario alto |
| --- | --- | --- |
| Tamaño de un respaldo al cierre del año (con la purga activa) | ≈ 60 MB | ≈ 350 MB |
| 7 respaldos | ≈ 0.4 GB | ≈ 2.5 GB |
| 7 respaldos si no se resolviera ningún caso | ≈ 1.3 GB | ≈ 8.5 GB |

El tamaño del volcado comprimido es una estimación (unos 5 a 15 MB); el de las
fotografías se deduce de la sección 5.3.

### 5.5 Disco total al cierre del primer año

| Concepto | Escenario esperado | Escenario alto |
| --- | --- | --- |
| Imágenes de Docker (`app` 331 MB, `postgres` 419 MB, `nginx` 74 MB) | 0.8 GB | 0.8 GB |
| Base de datos | 0.1 GB | 0.15 GB |
| Fotografías | 0.05 a 0.2 GB | 0.3 a 1.2 GB |
| Respaldos (7 días) | 0.4 a 1.3 GB | 2.5 a 8.5 GB |
| Registros de contenedores (tope de 90 MB) | 0.1 GB | 0.1 GB |
| **Total** | **≈ 1.5 a 2.5 GB** | **≈ 4 a 11 GB** |

Un disco de **20 GB** cubre el escenario alto con margen. Durante la
compilación de la imagen, Docker ocupa además varios gigabytes de caché que se
liberan con `docker builder prune`.

---

## 6. Viabilidad en una máquina virtual compartida

1. **No compite por CPU fuera de la hora punta.** En reposo el consumo es
   nulo; el uso se concentra en los horarios de comida.
2. **Memoria acotada y predecible.** 304 MB de pico bajo saturación. Puede
   fijarse un límite por contenedor para proteger a los demás servicios:

   ```bash
   docker update --cpus 0.50 --memory 512m --memory-swap 512m buzon-comedor-unsch-app-1
   docker update --cpus 0.25 --memory 256m --memory-swap 256m buzon-comedor-unsch-db-1
   docker update --cpus 0.10 --memory 64m  --memory-swap 64m  buzon-comedor-unsch-proxy-1
   ```

   Estos límites se pierden al recrear los contenedores; para hacerlos
   permanentes deben declararse en `docker-compose.yml`.
3. **Sin puertos adicionales.** Solo ocupa el puerto 80 (configurable con
   `NGINX_PORT`). La base de datos no publica ninguno.
4. **Entrada y salida de disco baja.** 0.3 escrituras por segundo en el pico
   más exigente.
5. **Aislamiento.** Redes propias, contenedor de aplicación sin privilegios y
   base de datos sin salida a internet.
6. **Tareas nocturnas breves.** El respaldo y la purga se ejecutan a las 03:00
   y 04:00 y toman segundos con los volúmenes previstos.

Dimensionamiento sugerido:

| Perfil | vCPU | RAM | Disco |
| --- | --- | --- | --- |
| Mínimo (compartido, imagen construida en otro equipo) | 0.5 | 1 GB | 10 GB |
| Recomendado | 1 | 2 GB | 20 GB |

---

## 7. Limitaciones de este informe

1. **Equipo de prueba distinto del servidor final.** Un núcleo del portátil
   usado puede ser más rápido que una vCPU del servidor institucional. Aun
   suponiendo la mitad de rendimiento por núcleo, el margen sobre el escenario
   alto sería de 3 veces. Se recomienda repetir la medición en el servidor
   definitivo.
2. **Base de datos casi vacía.** Las latencias no reflejan un año de datos
   acumulados. Las consultas del flujo del estudiante usan índices, pero dos
   pantallas del panel de moderación crecen con el volumen: la analítica carga
   todas las sugerencias en memoria y la búsqueda por texto recorre la tabla
   completa. Con decenas de miles de registros siguen siendo viables; conviene
   revisarlas si el volumen supera el escenario alto.
3. **Prueba corta.** 60 segundos no detectan fugas de memoria ni degradación a
   largo plazo. Se sugiere vigilar la memoria del contenedor `app` durante las
   primeras semanas.
4. **Cliente en el mismo equipo.** El generador de carga compartió CPU con el
   stack y no hubo latencia de red.
5. **Sin TLS.** El cifrado lo realiza el proxy perimetral de la UNSCH; su
   costo no forma parte de la medición.
6. **Inicio de sesión no incluido.** El canje con Google no se ejercitó; las
   sesiones de prueba se generaron con la clave local del entorno.
7. **Código de ticket.** El formato `UNSCH-XXXX` admite 810 000 códigos. Es
   suficiente para más de 80 años en el escenario esperado y unos 24 en el
   alto, pero es un límite absoluto del diseño actual.

---

## 8. Cómo repetir las mediciones

```bash
# Consumo instantáneo
docker stats --no-stream

# Tamaño real de cada tabla
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
SELECT relname AS tabla, n_live_tup AS filas,
       pg_size_pretty(pg_total_relation_size(relid)) AS total
FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC;
SQL

# Ocupación de los volúmenes y de los respaldos
docker system df -v | grep buzon-comedor
du -sh /opt/buzon_sugerencias/backups

# Latencia de la base y espacio libre
curl -s http://127.0.0.1/api/health
```

Para una prueba de carga propia puede usarse cualquier herramienta HTTP (`ab`,
`wrk`, `k6`) contra las rutas públicas `/`, `/seguimiento`, `/transparencia` y
`/api/health`. Evite `/login`, `/api/auth` y `/api/upload`, que tienen límite
de peticiones por IP.
