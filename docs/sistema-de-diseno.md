# Sistema de diseño y componentes de interfaz

Referencia de los componentes reutilizables de `src/components/` (kit Crimson Heritage). La redacción original es en inglés, igual que el código.

## Button (Issue 2.1)

Import `Button` and `ButtonProps` from `@/components/common/Button`. Variants are `primary` (default), `secondary`, `ghost`, and `tertiary`; sizes are `sm`, `md` (default), and `lg`. All sizes retain a minimum 44px touch target. Manrope is inherited from the root theme.

```tsx
<Button leftIcon={<Send />} onClick={handleSubmit}>Enviar sugerencia</Button>
<Button variant="secondary" rightIcon={<Search />}>Consultar ticket</Button>
<Button fullWidth isLoading={isSubmitting}>Enviar sugerencia</Button>
<Button as="a" href="/tickets" variant="ghost">Consultar ticket</Button>
```

Native button attributes and a React 19 `ref` are supported. `type` defaults to `button` to avoid unintended form submission; set `type="submit"` explicitly inside a form. `as="a"` requires `href` and accepts anchor attributes and an anchor reference instead of button attributes.

`isLoading` retains the label, replaces the left icon with a decorative Lucide spinner, and disables the action. Disabled links lose their destination and tab stop, and their click handler suppresses activation. Native buttons use the HTML `disabled` attribute. Both expose `aria-busy` and `aria-disabled`; decorative icons stay outside the accessible name. Supply an explicit Spanish `aria-label` for icon-only controls. Reduced-motion preferences disable the spinner animation, scaling, and transitions.

`ButtonShowcase` covers all variants, sizes, disabled/loading states, full width, and link rendering. The loading demonstration uses an explicit finish control so it can be tested without timers or network calls. Validate with `npm run test` and `npm run check-all` using the environment documented above.

## Badges (Issue 2.3)

The home page includes `BadgeShowcase` and the button demonstration. All examples use local state only.

`Badge` is a compact, non-interactive span that can render on the server. It accepts native span attributes, `children`, `className`, `icon`, `withDot`, and `pulse`. Variants are `primary`, `secondary`, `tertiary`, `neutral` (default), `success`, `warning`, and `outline`; sizes are `sm` (default) and `md`. Pulse is opt-in, only applies to the dot, and stops with reduced motion. Icons and dots are decorative; readable labels carry the meaning.

```tsx
<Badge variant="tertiary" withDot pulse>Aviso del sistema</Badge>
<StatusBadge status="pending" />
<StatusBadge status="in_review" size="md" />
<ShiftBadge shift="lunch" isSelected />
```

`StatusBadge` derives its status type from `Database` and maps `pending`, `in_review`, and `resolved` to Pendiente, En revisión, and Atendido with Clock, Eye, and CheckCircle2. Colors follow the prescribed amber, tertiary, and emerald palettes. `ShiftBadge` similarly maps breakfast, lunch, and dinner to Desayuno, Almuerzo, and Cena with Coffee, UtensilsCrossed, and Moon. Selection uses the primary token and includes hidden text for assistive technology.

Domain components accept the base badge's size, dot, pulse, and native span attributes, while resolving their own labels, variants, and icons. For an interactive filter, wrap `ShiftBadge` in a native button with `aria-pressed`, a click handler, and a 44px minimum touch target, as shown in `BadgeShowcase`. Use a live region around an updated ticket status only where announcements are needed; static badges do not announce themselves independently.

## Card and Modal (Issue 2.4)

The home page includes `CardModalShowcase` alongside the badge and button examples. Its form remains a local demonstration and performs no network requests or persistence.

`Card` supports `default`, `interactive`, `bordered`, and `ghost` variants and `none`, `sm`, `md` (default), and `lg` padding. Compose it with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`. Each subcomponent forwards native attributes and `className`; `CardTitle` defaults to `h2` and also supports `h3`/`h4`. Set `CardFooter withBorder` for the optional separator. Padding belongs to the root; subcomponents provide internal spacing without doubling it. All cards keep `rounded-2xl` and `shadow-sm`.

The interactive variant provides visual feedback. Supply a native link or button for the action, as demonstrated by the accessible button covering the lunch card. Do not nest additional interactive controls under that covering button.

```tsx
<Card>
  <CardHeader><CardTitle>Tu sugerencia</CardTitle></CardHeader>
  <CardContent><CardDescription>Comparte una idea para mejorar el comedor.</CardDescription></CardContent>
  <CardFooter withBorder><Button onClick={openModal}>Continuar</Button></CardFooter>
</Card>
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Comparte una idea">
  <p>Contenido de prueba.</p>
</Modal>
```

`Modal` is controlled: its owner must set `isOpen` to false in `onClose`. It uses native `dialog.showModal()` to enter the browser's top layer and make background content inert. Opening focuses its title; Tab and Shift+Tab remain within the dialog, and closing restores focus to the opener. Escape, the optional X button, and a pointer gesture that starts and ends on the backdrop request closure. Interior clicks and drags starting inside do not dismiss it. Body scroll locks are counted across instances and restore the previous inline overflow value on cleanup.

Optional props are `title`, `description`, `footer`, `size` (`sm`, `md`, `lg`, `full`), and `showCloseButton` (default true). Missing titles receive a hidden Spanish accessible name. Each instance uses distinct label IDs. If hiding the X, provide a visible closing action in the content/footer for touch users. The demonstration always retains Cancelar.

The dialog remains hidden during server rendering until its client effect opens it. A structural wrapper prevents parent spacing utilities from overriding its centered margins. Long content scrolls inside a viewport-limited panel while the header/footer remain visible. The fade animation respects reduced motion. Native `<dialog>` support is required; see [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

## EmptyState (Issue 2.5)

`EmptyState` accepts a Lucide component in `icon`, Spanish `title` and `description`, optional `action` and `secondaryAction`, `variant` (`card` by default or `plain`), and `className`. Card mode uses `rounded-2xl`, `shadow-sm`, a subtle border, and 32px padding. Plain mode has no background, border, or shadow and uses 40px vertical / 16px horizontal padding for embedding inside another container.

Both actions reuse `Button`. The primary action uses the primary variant and may include a Lucide `icon`; the secondary action uses ghost. Each accepts `label`, `onClick`, and `href`. A nonempty `href` renders a native link and keeps normal browser navigation; if a callback is also supplied, it runs on activation. Without `href`, the action is a non-submitting native button. An action without either a destination or a callback is disabled. Omitted actions render no controls.

```tsx
<EmptyState
  {...emptyStatePresets.ticketNotFound}
  action={{ label: "Buscar otro ticket", href: "#ticket-search", icon: Search }}
/>
<EmptyState
  {...emptyStatePresets.inboxClear}
  variant="plain"
  secondaryAction={{ label: "Refrescar datos", onClick: refreshData }}
/>
```

Import presets from `@/components/common/emptyStatePresets` and `EmptyState` from `@/components/common/EmptyState`. Render callback-based usages within a Client Component; static and link-only compositions may be rendered from synchronous Server Components. Keep the icon component and its preset in the same rendering environment rather than passing function-valued icons across a server/client boundary.

Each instance connects its heading and description through unique IDs. Icons are decorative, actions have visible Spanish labels, and the component does not create an alert/live region by default. The showcase puts announcements in separate status regions, demonstrates link navigation to a focused ticket field, and refreshes a simulated inbox without API calls or storage.

## Campos de formulario (Issue 2.2)

`Input` y `Textarea` se incorporaron durante el cierre del Issue 2.6 porque faltaban en el repositorio. Ambos requieren `label`, aceptan `helperText`, `error`, atributos HTML nativos, `className` y `ref` de React 19. Asocian etiquetas, ayuda y errores con IDs únicos, conservan `aria-describedby` externo y marcan `aria-invalid` cuando hay un error. La validación pertenece al formulario consumidor.

`Textarea` es controlado: requiere `value: string` y un `onChange` para editar, o `readOnly` para lectura. Su contador (`showCount`, activo por defecto) refleja el valor y el `maxLength` opcional; cuenta unidades UTF-16, como el límite nativo del navegador. No anuncia cada pulsación. El formulario de ejemplo valida un código ficticio `UNSCH-A39B`, exige 20 caracteres de contenido útil y limita la propuesta a 300. Al fallar, muestra ayuda didáctica y enfoca el primer campo inválido. Limpiar restablece valores, contador y errores. Estas reglas de ejemplo no constituyen el contrato definitivo del backend.

## AlertBanner (Issue 2.6)

`AlertBanner` es un Client Component. Recibe `description: ReactNode`, `title?`, `variant?`, `icon?: LucideIcon`, `action?`, `onClose?`, `isDismissible?` y `className?`. Usa Manrope, `rounded-2xl`, `shadow-sm`, iconos decorativos y controles con área táctil mínima de 44px.

| Variante | Uso | Paleta | Rol |
| --- | --- | --- | --- |
| `system` (predeterminada) | Avisos de la plataforma | `tertiary` #001586, fondo 5%, borde 20% | `status` |
| `info` | Orientación general | Neutros, texto gris oscuro | `status` |
| `warning` | Atención requerida | Ámbar | `alert` |
| `error` | Fallos de la operación | `primary` #5C0000, fondo 5%, borde 20% | `alert` |
| `success` | Confirmaciones | Esmeralda | `status` |

```tsx
<AlertBanner
  title="Aviso de la plataforma"
  description="Conserva tu código para consultar el estado de tu sugerencia."
  action={{ label: "Consultar ticket", href: "#ticket-search" }}
/>
<AlertBanner
  variant="error"
  title="No pudimos completar la consulta"
  description="Inténtalo nuevamente en unos minutos."
  action={{ label: "Reintentar", onClick: retry }}
  onClose={handleDismiss}
/>
```

El azul técnico no identifica a la institución: las etiquetas institucionales del encabezado y del contenedor usan carmesí. Las variantes `tertiary` de Button/Badge se reservan para avisos y el estado automático «En revisión» mantiene la semántica del Issue 2.3.

Una acción con `href` usa un enlace nativo; con `onClick` usa un botón que no envía formularios. Si se proporcionan ambos, el enlace conserva el callback. Sin destino ni callback, el botón queda deshabilitado.

`onClose` habilita el descarte por defecto. `isDismissible={false}` lo deshabilita; `isDismissible={true}` permite descartarlo localmente incluso sin callback. El componente se oculta después de la transición de 200ms y entonces llama a `onClose` una sola vez. El temporizador se cancela al desmontar y el movimiento reducido omite la espera. Para mostrar un nuevo aviso, monta una instancia nueva (por ejemplo, cambia su `key`). El consumidor decide dónde devolver el foco; la vitrina enfoca el botón para restaurar el aviso. No se descarta automáticamente por tiempo.

Define callbacks e iconos personalizados dentro de un Client Component para respetar la frontera de serialización de Next.js. Usa `alert` para mensajes urgentes y `status` para actualizaciones no urgentes. El anuncio inicial de contenido estático depende del lector de pantalla; estos roles son especialmente útiles cuando se insertan o actualizan mensajes tras una interacción.
