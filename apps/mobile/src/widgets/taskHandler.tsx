import React from "react";
import type { WidgetInfo, WidgetTaskHandlerProps } from "react-native-android-widget";
import { todayKey } from "@habit/core";
import { actions, appSnapshot, ensureLoaded } from "../lib/store";
import { supabase } from "../lib/supabase";
import { isLiveSync, pushDoc } from "../lib/sync";
import { progressModel, todayModel } from "./model";
import { ProgressWidget, TodayWidget } from "./StreakliWidgets";

export const WIDGET_NAMES = ["StreakliToday", "StreakliProgress"] as const;
export type WidgetName = (typeof WIDGET_NAMES)[number];

/** Render the given widget from the current app state. */
export function renderFor(name: string, info: Pick<WidgetInfo, "width" | "height">) {
  const state = appSnapshot();
  const today = todayKey();
  switch (name) {
    case "StreakliProgress":
      return <ProgressWidget model={progressModel(state, today)} />;
    case "StreakliToday":
    default:
      return <TodayWidget model={todayModel(state, today)} height={info.height} />;
  }
}

/**
 * Widget events (add / update / resize / tap). Runs headless when the app is
 * closed: reads the same storage as the app, and after a tap pushes the change
 * to the cloud itself (the app's CloudSync isn't running then).
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  await ensureLoaded();
  const { widgetInfo } = props;

  if (props.widgetAction === "WIDGET_DELETED") return;

  if (props.widgetAction === "WIDGET_CLICK" && props.clickAction === "TOGGLE") {
    const habitId = String(props.clickActionData?.habitId ?? "");
    if (habitId) {
      actions.toggle(habitId, todayKey());
      await pushIfAppClosed();
      // Refresh the other widgets too (progress ring etc.).
      void updateAllWidgets();
    }
  }

  props.renderWidget(renderFor(widgetInfo.widgetName, widgetInfo));
}

async function pushIfAppClosed() {
  if (isLiveSync() || !supabase) return;
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (uid) await pushDoc(supabase, uid, "app", appSnapshot());
  } catch {
    // offline — the next app launch pushes it
  }
}

/** Redraw every Streakli widget on the home screen (no-op if none are placed). */
export async function updateAllWidgets(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requestWidgetUpdate } = require("react-native-android-widget") as typeof import("react-native-android-widget");
    await Promise.all(
      WIDGET_NAMES.map((name) =>
        requestWidgetUpdate({ widgetName: name, renderWidget: (info) => renderFor(name, info) }),
      ),
    );
  } catch {
    // module missing (web preview / old build) — nothing to update
  }
}
