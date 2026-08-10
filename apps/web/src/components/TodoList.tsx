"use client";

import { useLayoutEffect, useRef } from "react";
import type { Todo } from "@habit/core";
import { TodoRow } from "./TodoRow";

/**
 * Renders the day's to-dos and smoothly animates rows to their new position
 * when the order changes (e.g. starring bumps a task up). Uses the FLIP
 * technique: measure Before, let React reorder, then invert + play so each row
 * glides from its old spot instead of snapping — no animation library needed.
 */
export function TodoList({
  todos,
  onToggle,
  onStar,
  onDelete,
}: {
  todos: Todo[];
  onToggle: (id: string) => void;
  onStar: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const prevTops = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const nextTops = new Map<string, number>();
    rowRefs.current.forEach((el, id) => {
      nextTops.set(id, el.offsetTop);
    });

    if (!prefersReduced) {
      rowRefs.current.forEach((el, id) => {
        const prev = prevTops.current.get(id);
        const next = nextTops.get(id)!;
        if (prev != null && prev !== next) {
          const dy = prev - next;
          el.style.transition = "none";
          el.style.transform = `translateY(${dy}px)`;
          // Next frame: release to the new position with a transition.
          requestAnimationFrame(() => {
            el.style.transition = "transform 260ms cubic-bezier(0.2, 0.7, 0.3, 1)";
            el.style.transform = "";
          });
        }
      });
    }

    prevTops.current = nextTops;
  }, [todos]);

  return (
    <div className="space-y-2">
      {todos.map((t) => (
        <div
          key={t.id}
          ref={(el) => {
            if (el) rowRefs.current.set(t.id, el);
            else rowRefs.current.delete(t.id);
          }}
          style={{ willChange: "transform" }}
        >
          <TodoRow
            todo={t}
            onToggle={() => onToggle(t.id)}
            onStar={() => onStar(t.id)}
            onDelete={() => onDelete(t.id)}
          />
        </div>
      ))}
    </div>
  );
}
