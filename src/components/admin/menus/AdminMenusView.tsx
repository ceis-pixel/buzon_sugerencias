"use client";

import { useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Edit,
  History,
  Loader2,
  Lock,
  PlusCircle,
  RotateCcw,
  Save,
  Star,
  Unlock,
  Utensils,
} from "lucide-react";

import {
  saveDailyMenu,
  toggleMenuStatus,
} from "@/lib/actions/menuRatingActions";
import type { DailyMenuWithStats, ShiftType } from "@/types/database.types";

export interface AdminMenusViewProps {
  initialMenus: DailyMenuWithStats[];
}

const SHIFT_LABELS: Record<ShiftType, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
};

export function AdminMenusView({ initialMenus }: AdminMenusViewProps) {
  const [menus, setMenus] = useState<DailyMenuWithStats[]>(initialMenus);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [shift, setShift] = useState<ShiftType>("lunch");
  const [mainDish, setMainDish] = useState<string>("");
  const [sideDish, setSideDish] = useState<string>("");
  const [beverage, setBeverage] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split("T")[0]);
    setShift("lunch");
    setMainDish("");
    setSideDish("");
    setBeverage("");
    setIsActive(true);
  };

  const handleEditClick = (menu: DailyMenuWithStats) => {
    setEditingId(menu.id);
    setDate(menu.date);
    setShift(menu.shift);
    setMainDish(menu.main_dish);
    setSideDish(menu.side_dish || "");
    setBeverage(menu.beverage || "");
    setIsActive(menu.is_active);
    setStatusMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainDish.trim()) {
      setStatusMessage({
        type: "error",
        text: "El plato principal es obligatorio (mínimo 3 caracteres).",
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await saveDailyMenu({
        id: editingId || undefined,
        date,
        shift,
        mainDish: mainDish.trim(),
        sideDish: sideDish.trim() || undefined,
        beverage: beverage.trim() || undefined,
        isActive,
      });

      if (!response.success || !response.data) {
        setStatusMessage({
          type: "error",
          text: response.message || "Error al guardar el menú.",
        });
      } else {
        const saved = response.data;
        setStatusMessage({
          type: "success",
          text: response.message || "Menú guardado y publicado correctamente.",
        });

        // Update local list
        setMenus((prev) => {
          const index = prev.findIndex((m) => m.id === saved.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...saved };
            return updated;
          }
          return [{ ...saved, stats: { count: 0, avg_main: 0, avg_side: null, avg_beverage: null, avg_overall: 0 } }, ...prev];
        });

        resetForm();
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Error de red al comunicarse con el servidor.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (menuId: string, currentStatus: boolean) => {
    setTogglingId(menuId);
    try {
      const nextStatus = !currentStatus;
      const res = await toggleMenuStatus(menuId, nextStatus);
      if (res.success) {
        setMenus((prev) =>
          prev.map((m) => (m.id === menuId ? { ...m, is_active: nextStatus } : m)),
        );
        setStatusMessage({
          type: "success",
          text: res.message,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.message,
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Error al cambiar el estado del menú.",
      });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Title Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-gray/20 pb-4">
        <div>
          <h1 className="font-sans text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
            Gestión de Menús Diarios y Calificaciones
          </h1>
          <p className="mt-1 text-sm text-neutral-gray">
            Programación nutricional oficial de la FUSCH y control del termómetro estudiantil.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 text-sm ${
            statusMessage.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-red-200 bg-red-50 text-red-900"
          }`}
          role="alert"
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Grid: Creation / Edit Form & Weekly History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <section
          aria-labelledby="menu-form-title"
          className="lg:col-span-5 rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
                {editingId ? <Edit className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
              </span>
              <h2 id="menu-form-title" className="font-sans text-base font-bold text-gray-900">
                {editingId ? "Editar Programación de Menú" : "Registrar Menú del Día"}
              </h2>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-gray hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Cancelar</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date & Shift */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="menu-date"
                  className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1"
                >
                  Fecha del Servicio
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="menu-date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-neutral-gray/30 bg-slate-50/50 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="menu-shift"
                  className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1"
                >
                  Turno
                </label>
                <select
                  id="menu-shift"
                  value={shift}
                  onChange={(e) => setShift(e.target.value as ShiftType)}
                  className="w-full rounded-xl border border-neutral-gray/30 bg-slate-50/50 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="breakfast">Desayuno (Mañana)</option>
                  <option value="lunch">Almuerzo (Mediodía)</option>
                  <option value="dinner">Cena (Noche)</option>
                </select>
              </div>
            </div>

            {/* Main Dish */}
            <div>
              <label
                htmlFor="main-dish"
                className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1"
              >
                Plato Principal / Segundo <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="main-dish"
                  required
                  placeholder="ej. Seco de res con frijoles y arroz"
                  maxLength={150}
                  value={mainDish}
                  onChange={(e) => setMainDish(e.target.value)}
                  className="w-full rounded-xl border border-neutral-gray/30 bg-slate-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors placeholder:text-neutral-gray/60 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Side Dish / Soup */}
            <div>
              <label
                htmlFor="side-dish"
                className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1"
              >
                Sopa o Entrada <span className="text-neutral-gray font-normal text-[11px]">(opcional)</span>
              </label>
              <input
                type="text"
                id="side-dish"
                placeholder="ej. Sopa de morón / Ensalada fresca"
                maxLength={150}
                value={sideDish}
                onChange={(e) => setSideDish(e.target.value)}
                className="w-full rounded-xl border border-neutral-gray/30 bg-slate-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors placeholder:text-neutral-gray/60 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Beverage */}
            <div>
              <label
                htmlFor="beverage"
                className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1"
              >
                Refresco / Bebida <span className="text-neutral-gray font-normal text-[11px]">(opcional)</span>
              </label>
              <input
                type="text"
                id="beverage"
                placeholder="ej. Chicha morada natural"
                maxLength={100}
                value={beverage}
                onChange={(e) => setBeverage(e.target.value)}
                className="w-full rounded-xl border border-neutral-gray/30 bg-slate-50/50 px-3 py-2.5 text-sm text-gray-900 transition-colors placeholder:text-neutral-gray/60 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Active Toggle Switch */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-gray/15 bg-slate-50 p-3.5">
              <div>
                <span className="text-xs font-bold text-gray-800">
                  Recepción de Calificaciones
                </span>
                <p className="text-[11px] text-neutral-gray">
                  {isActive
                    ? "Abierto: los alumnos pueden calificar este menú."
                    : "Cerrado: no se recibirán más votos para este turno."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isActive ? "bg-primary" : "bg-neutral-gray/40"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando programación...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{editingId ? "Actualizar Menú" : "Publicar Menú en Portal"}</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* History & Metrics Column */}
        <section
          aria-labelledby="menu-history-title"
          className="lg:col-span-7 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/15 text-primary shadow-xs">
                <History className="h-4 w-4" />
              </span>
              <h2 id="menu-history-title" className="font-sans text-base font-bold text-gray-900">
                Historial de Menús y Termómetro Consolidado
              </h2>
            </div>
            <span className="text-xs text-neutral-gray">
              {menus.length} turno{menus.length === 1 ? "" : "s"} registrado{menus.length === 1 ? "" : "s"}
            </span>
          </div>

          {menus.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-gray/30 bg-white p-8 text-center">
              <Utensils className="mx-auto h-8 w-8 text-neutral-gray/60 mb-2" />
              <p className="text-sm font-bold text-gray-700">No hay menús registrados aún</p>
              <p className="mt-1 text-xs text-neutral-gray">
                Utiliza el formulario de la izquierda para registrar la primera minuta del comedor.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {menus.map((item) => {
                const s = item.stats;
                const count = s?.count ?? 0;
                const avgOverall = s?.avg_overall ?? 0;
                const isTogglingThis = togglingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border bg-white p-4 shadow-sm transition-all hover:border-secondary/40 ${
                      item.is_active ? "border-gray-200" : "border-neutral-gray/20 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          <Calendar className="h-3 w-3" />
                          {item.date}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-secondary/15 px-2 py-0.5 text-xs font-bold text-secondary">
                          {SHIFT_LABELS[item.shift]}
                        </span>
                        {item.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Abierto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-gray">
                            <Lock className="h-3 w-3" />
                            Cerrado
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item.id, item.is_active)}
                          disabled={isTogglingThis}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                            item.is_active
                              ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          } disabled:opacity-50`}
                          title={
                            item.is_active
                              ? "Cerrar recepción de calificaciones"
                              : "Reabrir recepción de calificaciones"
                          }
                        >
                          {isTogglingThis ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : item.is_active ? (
                            <>
                              <Lock className="h-3 w-3" />
                              <span>Cerrar</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3 w-3" />
                              <span>Reabrir</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditClick(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-gray/25 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-slate-100 transition-colors"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>

                    {/* Dish details */}
                    <div className="space-y-1 text-sm">
                      <p className="font-bold text-gray-900 flex items-baseline gap-1.5">
                        <span className="text-xs uppercase tracking-wide text-neutral-gray font-bold">
                          Principal:
                        </span>
                        <span>{item.main_dish}</span>
                      </p>
                      {item.side_dish && (
                        <p className="text-xs text-gray-700 flex items-baseline gap-1.5">
                          <span className="text-[11px] uppercase tracking-wide text-neutral-gray font-bold">
                            Sopa / Entrada:
                          </span>
                          <span>{item.side_dish}</span>
                        </p>
                      )}
                      {item.beverage && (
                        <p className="text-xs text-gray-700 flex items-baseline gap-1.5">
                          <span className="text-[11px] uppercase tracking-wide text-neutral-gray font-bold">
                            Bebida:
                          </span>
                          <span>{item.beverage}</span>
                        </p>
                      )}
                    </div>

                    {/* Metrics Row */}
                    <div className="mt-3 pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 font-bold text-gray-900">
                          <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-500" />
                          {avgOverall > 0 ? avgOverall.toFixed(1) : "—"} / 5.0
                        </span>
                        <span className="text-neutral-gray">
                          {count} voto{count === 1 ? "" : "s"} emitido{count === 1 ? "" : "s"}
                        </span>
                      </div>

                      {s && count > 0 && (
                        <div className="flex items-center gap-2 text-[11px] text-neutral-gray">
                          <span>Plato: <strong>{s.avg_main.toFixed(1)}</strong></span>
                          {s.avg_side !== null && (
                            <span>· Sopa: <strong>{s.avg_side.toFixed(1)}</strong></span>
                          )}
                          {s.avg_beverage !== null && (
                            <span>· Bebida: <strong>{s.avg_beverage.toFixed(1)}</strong></span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
