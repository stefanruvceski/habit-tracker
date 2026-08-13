"use client";

import { useMemo } from "react";
import {
  WEEKDAY_LONG,
  bestWeekday,
  consistencyRanking,
  moodHabitLink,
} from "@habit/core";
import type { Entries, Habit, Mental } from "@habit/core";
import { Card } from "./ui";

const WINDOW_DAYS = 30;

/**
 * Narrative "insights" from the last 30 days — patterns a single day can't show:
 * strongest weekday, most consistent habit, one that's slipping, and whether
 * completing habits tracks with a better mood. Renders only what it can support.
 */
export function Insights({
  entries,
  habits,
  mental,
}: {
  entries: Entries;
  habits: Habit[];
  mental: Mental;
}) {
  const items = useMemo<{ icon: string; text: React.ReactNode }[]>(() => {
    const out: { icon: string; text: React.ReactNode }[] = [];

    const best = bestWeekday(entries, habits, WINDOW_DAYS);
    if (best && best.progress > 0) {
      out.push({
        icon: "📅",
        text: (
          <>
            <b>{WEEKDAY_LONG[best.weekday]}</b> is your strongest day —{" "}
            {Math.round(best.progress * 100)}% completion on average.
          </>
        ),
      });
    }

    const ranking = consistencyRanking(entries, habits, WINDOW_DAYS);
    if (ranking.length > 0) {
      const top = ranking[0];
      out.push({
        icon: "🏆",
        text: (
          <>
            Most consistent: <b>{top.habit.name}</b> —{" "}
            {Math.round(top.rate * 100)}% of scheduled days.
          </>
        ),
      });
      const weakest = ranking[ranking.length - 1];
      if (ranking.length > 1 && weakest.rate < 0.5 && weakest.rate < top.rate) {
        out.push({
          icon: "🌱",
          text: (
            <>
              Needs attention: <b>{weakest.habit.name}</b> — only{" "}
              {Math.round(weakest.rate * 100)}% lately.
            </>
          ),
        });
      }
    }

    const link = moodHabitLink(entries, habits, mental, WINDOW_DAYS);
    if (link && Math.abs(link.delta) >= 3) {
      out.push({
        icon: link.delta > 0 ? "😊" : "🤔",
        text:
          link.delta > 0 ? (
            <>
              On days you complete more habits, your mood averages{" "}
              <b>{Math.round(link.delta)} pts higher</b>.
            </>
          ) : (
            <>
              Interestingly, your mood isn&apos;t higher on high-completion days
              lately.
            </>
          ),
      });
    }

    return out;
  }, [entries, habits, mental]);

  if (items.length === 0) return null;

  return (
    <Card>
      <h2 className="text-sm font-semibold text-text-dim mb-3">
        Insights · last 30 days
      </h2>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="text-lg leading-none shrink-0">{it.icon}</span>
            <span className="text-text">{it.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
