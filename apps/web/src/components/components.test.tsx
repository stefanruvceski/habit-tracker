import { describe, test, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import type { Habit } from "@habit/core";
import { HABIT_ICONS } from "@habit/core";
import { HabitGlyph } from "./HabitGlyph";
import { HabitRow } from "./HabitRow";
import { Heatmap } from "./Heatmap";
import { LineChart } from "./LineChart";
import { MonthGrid } from "./MonthGrid";
import { NavBar } from "./NavBar";
import {
  TodayIcon,
  MonthIcon,
  YearIcon,
  HabitsIcon,
  FinanceIcon,
} from "./icons";

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    name: "Gym",
    icon: "dumbbell",
    emoji: "🏋️",
    color: "#34d399",
    type: "build",
    schedule: { type: "daily" },
    archived: false,
    order: 0,
    createdAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("nav icons", () => {
  test("each renders an svg", () => {
    for (const Icon of [TodayIcon, MonthIcon, YearIcon, HabitsIcon, FinanceIcon]) {
      const { container, unmount } = render(<Icon />);
      expect(container.querySelector("svg")).toBeTruthy();
      unmount();
    }
  });
});

describe("HabitGlyph", () => {
  test("renders a built-in icon as svg", () => {
    const { container } = render(<HabitGlyph icon={HABIT_ICONS[0].id} color="#fff" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  test("falls back to the emoji when the icon is unknown", () => {
    const { getByText } = render(<HabitGlyph icon="___nope___" emoji="🎯" />);
    expect(getByText("🎯")).toBeTruthy();
  });

  test("falls back to the emoji when no icon id is given", () => {
    const { getByText } = render(<HabitGlyph emoji="🔥" />);
    expect(getByText("🔥")).toBeTruthy();
  });
});

describe("HabitRow", () => {
  test("renders and fires onToggle", () => {
    const onToggle = vi.fn();
    const { getByRole } = render(
      <HabitRow habit={habit()} done={false} streak={3} onToggle={onToggle} />,
    );
    fireEvent.click(getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  test("renders in the done state", () => {
    const { getByRole } = render(
      <HabitRow habit={habit()} done streak={0} onToggle={() => {}} />,
    );
    expect(getByRole("button")).toBeTruthy();
  });
});

describe("Heatmap", () => {
  test("renders cells for the year", () => {
    const { container } = render(
      <Heatmap color="#34d399" year={2026} getState={() => "done"} />,
    );
    expect(container.querySelectorAll("rect").length).toBeGreaterThan(300);
  });

  test("handles off/missed states too", () => {
    const states = ["done", "missed", "off"] as const;
    const { container } = render(
      <Heatmap
        color="#60a5fa"
        year={2026}
        getState={(k) => states[k.charCodeAt(9) % 3]}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

describe("LineChart", () => {
  test("renders series with and without data points", () => {
    const { container } = render(
      <LineChart
        labels={["Jan", "Feb", "Mar"]}
        series={[
          { color: "#34d399", label: "A", values: [0.2, null, 0.8] },
          { color: "#f472b6", label: "B", values: [null, null, null] },
        ]}
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  test("renders without the area fill", () => {
    const { container } = render(
      <LineChart labels={["Jan"]} series={[{ color: "#fff", label: "A", values: [0.5] }]} area={false} />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });
});

describe("MonthGrid", () => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  test("renders and toggles a cell", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <MonthGrid
        habits={[habit()]}
        entries={{ "2026-08-01": { h1: true } }}
        year={2026}
        month={7}
        days={days}
        onToggle={onToggle}
        autoScrollDay={10}
      />,
    );
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(onToggle).toHaveBeenCalled();
  });

  test("renders without auto-scroll", () => {
    const { container } = render(
      <MonthGrid
        habits={[habit()]}
        entries={{}}
        year={2026}
        month={7}
        days={days}
        onToggle={() => {}}
        autoScrollDay={null}
      />,
    );
    expect(container.querySelector("table")).toBeTruthy();
  });
});

describe("NavBar", () => {
  test("renders all tabs", () => {
    const { getByText } = render(<NavBar />);
    for (const label of ["Today", "Month", "Year", "Finance", "Habits"]) {
      expect(getByText(label)).toBeTruthy();
    }
  });
});
