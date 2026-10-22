import React from "react";
import { FlexWidget, ListWidget, SvgWidget, TextWidget } from "react-native-android-widget";
import type { ProgressModel, TodayModel, WeightModel } from "./model";
import { ringSvg, sparklineSvg } from "./model";

// Same palette as the app (lib/theme.ts), as hex literals the widget host accepts.
const BG = "#0a0f1e";
const ELEV = "#111a30";
const ELEV2 = "#16203a";
const BORDER = "#1f2b47";
const TEXT = "#eef2ff";
const DIM = "#9fb0d0";
const FAINT = "#64748b";
const ACCENT = "#34d399";

const SCHEME = process.env.EXPO_PUBLIC_APP_VARIANT === "dev" ? "streakli-dev" : "streakli";

/** Deep link that opens the app on Today with this habit's amount field focused. */
export function logUri(habitId: string): string {
  return `${SCHEME}://log/${encodeURIComponent(habitId)}`;
}

type Hex = `#${string}`;
const hex = (c: string): Hex => (c.startsWith("#") ? (c as Hex) : (`#${c}` as Hex));

function Check({ done, color }: { done: boolean; color: string }) {
  return (
    <FlexWidget
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: hex(color),
        backgroundColor: done ? hex(color) : (`${BG}00` as Hex),
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <TextWidget text={done ? "✓" : ""} style={{ fontSize: 15, color: BG as Hex, fontWeight: "700" }} />
    </FlexWidget>
  );
}

export function TodayWidget({ model, height }: { model: TodayModel; height: number }) {
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: BG as Hex,
        borderRadius: 24,
        padding: 12,
        flexDirection: "column",
      }}
    >
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ flexDirection: "row", alignItems: "center", width: "match_parent", marginBottom: 8, paddingHorizontal: 4 }}
      >
        <TextWidget text="Today" style={{ fontSize: 17, color: TEXT as Hex, fontWeight: "800" }} />
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget
          text={`${model.done}/${model.total}`}
          style={{ fontSize: 14, color: (model.total && model.done === model.total ? ACCENT : DIM) as Hex, fontWeight: "700" }}
        />
      </FlexWidget>

      {model.total === 0 ? (
        <TextWidget text="No habits scheduled today" style={{ fontSize: 13, color: FAINT as Hex }} />
      ) : (
        <ListWidget style={{ height: Math.max(60, height - 60), width: "match_parent" }}>
          {model.sections.flatMap((s) => [
            <FlexWidget
              key={`h-${s.timeOfDay}`}
              style={{ flexDirection: "row", width: "match_parent", paddingHorizontal: 4, paddingTop: 6, paddingBottom: 4 }}
            >
              <TextWidget text={s.title} style={{ fontSize: 12, color: DIM as Hex, fontWeight: "700" }} />
              <FlexWidget style={{ flex: 1 }} />
              <TextWidget
                text={`${s.done}/${s.total}`}
                style={{ fontSize: 12, color: (s.done === s.total ? ACCENT : FAINT) as Hex, fontWeight: "700" }}
              />
            </FlexWidget>,
            ...s.rows.map((r) => (
              <FlexWidget
                key={r.id}
                clickAction={r.measurable ? "OPEN_URI" : "TOGGLE"}
                clickActionData={r.measurable ? { uri: logUri(r.id) } : { habitId: r.id }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  width: "match_parent",
                  backgroundColor: (r.done ? `${r.color}26` : ELEV) as Hex,
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  marginBottom: 6,
                }}
              >
                <FlexWidget style={{ flex: 1, flexDirection: "column" }}>
                  <TextWidget text={r.name} maxLines={1} truncate="END" style={{ fontSize: 14, color: TEXT as Hex, fontWeight: "600" }} />
                  {r.detail ? (
                    <TextWidget text={r.detail} style={{ fontSize: 11, color: DIM as Hex }} />
                  ) : null}
                </FlexWidget>
                {r.measurable && !r.done ? (
                  <FlexWidget
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 9,
                      backgroundColor: ELEV2 as Hex,
                      borderWidth: 1,
                      borderColor: hex(r.color),
                    }}
                  >
                    <TextWidget text="+ log" style={{ fontSize: 12, color: hex(r.color), fontWeight: "700" }} />
                  </FlexWidget>
                ) : (
                  <Check done={r.done} color={r.color} />
                )}
              </FlexWidget>
            )),
          ])}
        </ListWidget>
      )}
    </FlexWidget>
  );
}

export function ProgressWidget({ model }: { model: ProgressModel }) {
  const pct = `${Math.round(model.ratio * 100)}%`;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: BG as Hex,
        borderRadius: 24,
        padding: 12,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SvgWidget svg={ringSvg(model.ratio, 84, ACCENT, ELEV2, pct)} style={{ width: 84, height: 84 }} />
      <TextWidget
        text={`${model.done}/${model.total} done`}
        style={{ fontSize: 13, color: TEXT as Hex, fontWeight: "700", marginTop: 6 }}
      />
      <TextWidget
        text={model.streak > 0 ? `🔥 ${model.streak} · ${model.streakName ?? ""}` : model.next ?? "Streakli"}
        maxLines={1}
        truncate="END"
        style={{ fontSize: 11, color: DIM as Hex, marginTop: 2 }}
      />
    </FlexWidget>
  );
}

export function WeightWidget({ model, width }: { model: WeightModel | null; width: number }) {
  if (!model) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ height: "match_parent", width: "match_parent", backgroundColor: BG as Hex, borderRadius: 24, padding: 16, justifyContent: "center" }}
      >
        <TextWidget text="⚖️ Add an Amount habit (unit kg) to track weight" style={{ fontSize: 13, color: DIM as Hex }} />
      </FlexWidget>
    );
  }
  const chartW = Math.max(80, Math.round(width - 32 - 96));
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: BG as Hex,
        borderRadius: 24,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <FlexWidget clickAction="OPEN_APP" style={{ flexDirection: "column", width: 96 }}>
        <TextWidget text={model.name} maxLines={1} truncate="END" style={{ fontSize: 12, color: DIM as Hex, fontWeight: "700" }} />
        <TextWidget
          text={model.last ?? "—"}
          style={{ fontSize: 28, color: TEXT as Hex, fontWeight: "800" }}
        />
        <TextWidget text={model.unit} style={{ fontSize: 12, color: DIM as Hex }} />
        {model.change ? (
          <TextWidget text={model.change} maxLines={1} style={{ fontSize: 11, color: FAINT as Hex, marginTop: 2 }} />
        ) : null}
      </FlexWidget>
      <FlexWidget style={{ flex: 1, flexDirection: "column", alignItems: "flex-end" }}>
        <SvgWidget
          clickAction="OPEN_APP"
          svg={sparklineSvg(model.values, chartW, 56, model.color)}
          style={{ width: chartW, height: 56 }}
        />
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: logUri(model.habitId) }}
          style={{
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: (model.loggedToday ? ELEV2 : model.color) as Hex,
            borderWidth: 1,
            borderColor: (model.loggedToday ? BORDER : model.color) as Hex,
          }}
        >
          <TextWidget
            text={model.loggedToday ? "✓ Logged · edit" : "+ Log today"}
            style={{ fontSize: 12, color: (model.loggedToday ? DIM : BG) as Hex, fontWeight: "700" }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
