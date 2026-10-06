import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CategorySelector,
  CATEGORY_OPTIONS,
  getCategoryLabel,
  type CategorySelectorProps,
} from "@/components/suggestion/CategorySelector";
import {
  getCurrentShift,
  getShiftLabel,
  getShiftSchedule,
  SHIFT_OPTIONS,
  ShiftSelector,
  type ShiftSelectorProps,
} from "@/components/suggestion/ShiftSelector";
import type { ShiftType, SuggestionCategory } from "@/types/database.types";

function renderShiftSelector(props: ShiftSelectorProps) {
  return renderToStaticMarkup(createElement(ShiftSelector, props));
}

function renderCategorySelector(props: CategorySelectorProps) {
  return renderToStaticMarkup(createElement(CategorySelector, props));
}

describe("Shift detection and ShiftSelector component (Issue 6.1)", () => {
  describe("getCurrentShift smart default resolution", () => {
    it.each([
      [6, 0, "breakfast"],
      [6, 30, "breakfast"],
      [8, 30, "breakfast"],
      [10, 0, "breakfast"],
      [10, 59, "breakfast"],
    ] as const)("resolves %02d:%02d to breakfast", (hour, minute, expected) => {
      const date = new Date(2026, 8, 28, hour, minute);
      expect(getCurrentShift(date)).toBe(expected);
    });

    it.each([
      [11, 0, "lunch"],
      [11, 30, "lunch"],
      [13, 0, "lunch"],
      [14, 0, "lunch"],
      [15, 30, "lunch"],
      [16, 29, "lunch"],
    ] as const)("resolves %02d:%02d to lunch", (hour, minute, expected) => {
      const date = new Date(2026, 8, 28, hour, minute);
      expect(getCurrentShift(date)).toBe(expected);
    });

    it.each([
      [16, 30, "dinner"],
      [17, 30, "dinner"],
      [19, 0, "dinner"],
      [20, 30, "dinner"],
      [22, 0, "dinner"],
      [23, 59, "dinner"],
    ] as const)("resolves %02d:%02d to dinner", (hour, minute, expected) => {
      const date = new Date(2026, 8, 28, hour, minute);
      expect(getCurrentShift(date)).toBe(expected);
    });

    it.each([
      [0, 0, "breakfast"],
      [2, 30, "breakfast"],
      [5, 59, "breakfast"],
    ] as const)("resolves early morning %02d:%02d to breakfast (upcoming service)", (hour, minute, expected) => {
      const date = new Date(2026, 8, 28, hour, minute);
      expect(getCurrentShift(date)).toBe(expected);
    });
  });

  describe("Metadata helpers", () => {
    it("returns correct Spanish labels and schedules for all shifts", () => {
      expect(getShiftLabel("breakfast")).toBe("Desayuno");
      expect(getShiftLabel("lunch")).toBe("Almuerzo");
      expect(getShiftLabel("dinner")).toBe("Cena");

      expect(getShiftSchedule("breakfast")).toBe("06:30 - 08:30");
      expect(getShiftSchedule("lunch")).toBe("11:30 - 14:00");
      expect(getShiftSchedule("dinner")).toBe("17:30 - 19:30");
    });

    it("has 3 configured shifts with valid icons and non-empty schedules", () => {
      expect(SHIFT_OPTIONS).toHaveLength(3);
      for (const option of SHIFT_OPTIONS) {
        expect(option.label).toBeTruthy();
        expect(option.schedule).toBeTruthy();
        expect(option.icon).toBeDefined();
      }
    });
  });

  describe("ShiftSelector DOM structure and accessibility", () => {
    it("renders a 3-column radiogroup with accessible radio items", () => {
      const html = renderShiftSelector({
        value: "lunch",
        onChange: () => {},
      });

      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('aria-label="Seleccionar turno de atención"');
      expect(html).toContain("grid-cols-3");

      // Verify all 3 options are rendered
      expect(html).toContain("Desayuno");
      expect(html).toContain("Almuerzo");
      expect(html).toContain("Cena");

      // Schedules
      expect(html).toContain("06:30 - 08:30");
      expect(html).toContain("11:30 - 14:00");
      expect(html).toContain("17:30 - 19:30");
    });

    it("applies Crimson Heritage active styling to the selected shift", () => {
      const html = renderShiftSelector({
        value: "breakfast",
        onChange: () => {},
      });

      // The selected item must have aria-checked="true" and primary background
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain("bg-primary");
      expect(html).toContain("text-white");
      expect(html).toContain('tabindex="0"');

      // The non-selected items must have aria-checked="false"
      expect(html).toContain('aria-checked="false"');
    });

    it("respects the disabled attribute when provided", () => {
      const html = renderShiftSelector({
        value: "lunch",
        onChange: () => {},
        disabled: true,
      });

      expect(html.match(/disabled=""/g)?.length).toBe(3);
      expect(html).toContain("disabled:opacity-50");
    });
  });
});

describe("CategorySelector component in adaptive chips (Issue 6.2)", () => {
  describe("Metadata helpers", () => {
    it("returns correct Peruvian Spanish labels for all categories", () => {
      expect(getCategoryLabel("menu")).toBe("Menú / Sabor");
      expect(getCategoryLabel("hygiene")).toBe("Higiene / Limpieza");
      expect(getCategoryLabel("portion")).toBe("Cantidad / Porción");
      expect(getCategoryLabel("service")).toBe("Trato del Personal");
      expect(getCategoryLabel("infrastructure")).toBe("Infraestructura / Menaje");
      expect(getCategoryLabel(null)).toBe("");
    });

    it("has 5 configured categories with valid icons", () => {
      expect(CATEGORY_OPTIONS).toHaveLength(5);
      for (const option of CATEGORY_OPTIONS) {
        expect(option.label).toBeTruthy();
        expect(option.icon).toBeDefined();
      }
    });
  });

  describe("CategorySelector DOM structure and accessibility", () => {
    it("renders a flexible chips container with all 5 category options", () => {
      const html = renderCategorySelector({
        value: "hygiene",
        onChange: () => {},
      });

      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('aria-label="Seleccionar categoría de sugerencia"');
      expect(html).toContain("flex-wrap");

      expect(html).toContain("Menú / Sabor");
      expect(html).toContain("Higiene / Limpieza");
      expect(html).toContain("Cantidad / Porción");
      expect(html).toContain("Trato del Personal");
      expect(html).toContain("Infraestructura / Menaje");
    });

    it("shows short chip labels in the order Menú, Cantidad, Higiene, Atención, Infraestructura", () => {
      const html = renderCategorySelector({
        value: null,
        onChange: () => {},
      });

      const visible = [...html.matchAll(/<span class="text-gray-800">([^<]+)<\/span>/g)].map(
        (match) => match[1],
      );
      expect(visible).toEqual(["Menú", "Cantidad", "Higiene", "Atención", "Infraestructura"]);
    });

    it("highlights the selected chip with Crimson Heritage primary tokens", () => {
      const html = renderCategorySelector({
        value: "portion",
        onChange: () => {},
      });

      expect(html).toContain('aria-checked="true"');
      expect(html).toContain("bg-primary text-white");
    });

    it("allows tabIndex 0 on the first chip when no value is selected", () => {
      const html = renderCategorySelector({
        value: null,
        onChange: () => {},
      });

      // Renders all chips with aria-checked="false"
      expect(html).not.toContain('aria-checked="true"');
      // The first chip should have tabindex="0" for keyboard entry into the group
      expect(html).toContain('tabindex="0"');
    });

    it("renders error message and alert styling when errorMessage is provided", () => {
      const errorMessage = "Debes seleccionar una categoría válida.";
      const html = renderCategorySelector({
        value: null,
        onChange: () => {},
        errorMessage,
      });

      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('role="alert"');
      expect(html).toContain(errorMessage);
      expect(html).toContain("text-primary");
      expect(html).toContain("border-primary/40");
    });

    it("disables all chips when disabled prop is true", () => {
      const html = renderCategorySelector({
        value: "menu",
        onChange: () => {},
        disabled: true,
      });

      expect(html.match(/disabled=""/g)?.length).toBe(5);
    });
  });

  // Type check contracts (verified at compile time)
  // @ts-expect-error Invalid shift type should be rejected
  const invalidShift: ShiftType = "midnight_snack";
  // @ts-expect-error Invalid category type should be rejected
  const invalidCategory: SuggestionCategory = "general_feedback";
  void [invalidShift, invalidCategory];
});
