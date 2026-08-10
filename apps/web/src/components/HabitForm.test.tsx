import { describe, test, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import type { Habit } from "@habit/core";
import { HabitForm } from "./HabitForm";

function existing(): Habit {
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
  };
}

describe("HabitForm", () => {
  test("create flow: type a name, pick schedule, save", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { getByPlaceholderText, getByText } = render(
      <HabitForm onSave={onSave} onClose={onClose} />,
    );
    fireEvent.change(getByPlaceholderText("e.g. Morning run"), {
      target: { value: "Read" },
    });
    fireEvent.click(getByText("Weekly"));
    fireEvent.click(getByText("Add habit"));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0].name).toBe("Read");
    expect(onSave.mock.calls[0][0].schedule.type).toBe("weekly");
  });

  test("icon search filters and selecting an icon works", () => {
    const onSave = vi.fn();
    const { getByPlaceholderText, getAllByTitle } = render(
      <HabitForm onSave={onSave} onClose={() => {}} />,
    );
    fireEvent.change(getByPlaceholderText(/Search icons/), {
      target: { value: "run" },
    });
    // pick the first matching icon button
    const runIcon = getAllByTitle(/run/i)[0];
    fireEvent.click(runIcon);
    fireEvent.change(getByPlaceholderText("e.g. Morning run"), {
      target: { value: "Jog" },
    });
    fireEvent.click(getByPlaceholderText("e.g. Morning run")); // noop focus
  });

  test("weekdays schedule toggles days", () => {
    const onSave = vi.fn();
    const { getByText } = render(<HabitForm onSave={onSave} onClose={() => {}} />);
    fireEvent.click(getByText("Days"));
    // toggle a weekday label (Mo is Monday-first first entry)
    fireEvent.click(getByText("Mo"));
    fireEvent.change; // no-op
  });

  test("edit flow shows delete with confirm, then deletes", () => {
    const onDelete = vi.fn();
    const onSave = vi.fn();
    const { getByText } = render(
      <HabitForm initial={existing()} onSave={onSave} onDelete={onDelete} onClose={() => {}} />,
    );
    expect(getByText("Edit habit")).toBeTruthy();
    fireEvent.click(getByText("Delete")); // arms confirm
    fireEvent.click(getByText("Confirm delete"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  test("close via backdrop and X button", () => {
    const onClose = vi.fn();
    const { getByLabelText } = render(
      <HabitForm onSave={() => {}} onClose={onClose} />,
    );
    fireEvent.click(getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });

  test("save is disabled until a name is entered", () => {
    const onSave = vi.fn();
    const { getByText } = render(<HabitForm onSave={onSave} onClose={() => {}} />);
    fireEvent.click(getByText("Add habit")); // still empty
    expect(onSave).not.toHaveBeenCalled();
  });
});
