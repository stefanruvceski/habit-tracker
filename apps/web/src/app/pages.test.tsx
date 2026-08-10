import { beforeEach, describe, test, expect, vi } from "vitest";
import { act, render, fireEvent } from "@testing-library/react";
import type { FinanceState } from "@habit/core";
import { actions } from "../lib/store";
import { financeActions } from "../lib/financeStore";
import TodayPage from "./page";
import MonthPage from "./month/page";
import DashboardPage from "./dashboard/page";
import HabitsPage from "./habits/page";
import FinancePage from "./finance/page";

function financeSeed(): FinanceState {
  return {
    version: 1,
    baseCurrency: "RSD",
    sources: [
      { id: "s1", name: "Freelance", color: "#34d399", currency: "EUR", archived: false, order: 0, createdAt: "2026-01-01T00:00:00Z" },
    ],
    transactions: [
      { id: "t1", sourceId: "s1", date: "2026-02-10", amount: 1000, currency: "EUR", status: "paid", createdAt: "2026-02-10T00:00:00Z", fxRate: 117 },
      { id: "t2", sourceId: "s1", date: "2026-03-10", amount: 500, currency: "EUR", status: "invoiced", createdAt: "2026-03-10T00:00:00Z", fxRate: 117 },
    ],
    fxRates: [{ code: "EUR", rate: 117 }],
    goal: { target: 1000000, direction: "reach" },
    levels: [{ name: "Starter", min: 0 }, { name: "Builder", min: 100000 }],
    fxProvider: "general",
  };
}

beforeEach(() => {
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ rsd: { eur: 1 / 117 } }),
  })) as unknown as typeof fetch;
  act(() => actions.reset());
  act(() => financeActions.importFinance(financeSeed()));
});

describe("Today page", () => {
  test("renders and toggles a habit", () => {
    const { container } = render(<TodayPage />);
    expect(container.textContent!.length).toBeGreaterThan(0);
    const buttons = container.querySelectorAll("button");
    if (buttons.length) fireEvent.click(buttons[0]);
  });

  test("renders a measurable habit with +/- controls", () => {
    act(() =>
      actions.addHabit({
        name: "Water",
        emoji: "💧",
        color: "#60a5fa",
        type: "build",
        schedule: { type: "daily" },
        goalType: "measurable",
        target: 8,
        unit: "glasses",
      }),
    );
    const { getByText, getAllByLabelText } = render(<TodayPage />);
    expect(getByText("Water")).toBeTruthy();
    fireEvent.click(getAllByLabelText("Increase")[0]);
    fireEvent.click(getAllByLabelText("Decrease")[0]);
  });
});

describe("Month page", () => {
  test("renders the grid and changes month", () => {
    const { container } = render(<MonthPage />);
    const selects = container.querySelectorAll("select");
    if (selects.length) fireEvent.change(selects[0], { target: { value: "0" } });
    expect(container.querySelector("table")).toBeTruthy();
  });
});

describe("Dashboard page", () => {
  test("renders with the finance glance card", () => {
    const { getByText } = render(<DashboardPage />);
    expect(getByText("Yearly dashboard")).toBeTruthy();
    expect(getByText("Finance")).toBeTruthy();
  });
});

describe("Habits page", () => {
  test("renders and opens the new-habit form", () => {
    const { getByText, queryByText } = render(<HabitsPage />);
    expect(getByText("Habits")).toBeTruthy();
    const addBtn = queryByText(/New habit|New|Add habit|\+/);
    if (addBtn) fireEvent.click(addBtn);
  });
});

describe("Finance page", () => {
  test("renders KPIs and toggles paid/invoiced", () => {
    const { getByRole, getByText } = render(<FinancePage />);
    expect(getByText("Finance")).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "+ Invoiced" }));
    fireEvent.click(getByRole("button", { name: "Paid" }));
  });

  test("opens add-income and settings sections", () => {
    const { getByText, container } = render(<FinancePage />);
    fireEvent.click(getByText("+ Add income"));
    // settings toggle
    const settings = getByText("Settings");
    fireEvent.click(settings);
    expect(container.textContent).toContain("Totals currency");
  });

  test("switches year", () => {
    const { container } = render(<FinancePage />);
    const select = container.querySelector("select");
    if (select) fireEvent.change(select, { target: { value: "2026" } });
    expect(container.textContent!.length).toBeGreaterThan(0);
  });
});
