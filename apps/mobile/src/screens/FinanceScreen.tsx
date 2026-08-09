import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import {
  MONTH_SHORT,
  financeKpis,
  financeYears,
  monthTotals,
  sourceDistribution,
  todayKey,
  txBase,
  SUPPORTED_CURRENCIES,
} from "@habit/core";
import {
  financeActions,
  useFinanceHydrated,
  useFinanceState,
  useFxRefreshing,
} from "../lib/financeStore";
import { C, pct } from "../lib/theme";
import { Card, ProgressRing } from "../components/ui";

function fmtMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString()} ${currency}`;
  }
}

export function FinanceScreen() {
  const hydrated = useFinanceHydrated();
  const state = useFinanceState();
  const [year, setYear] = useState(new Date().getFullYear());
  const [showInvoiced, setShowInvoiced] = useState(false);

  const now = new Date();
  const refMonth = year === now.getFullYear() ? now.getMonth() : 11;

  const kpis = useMemo(() => financeKpis(state, year, refMonth), [state, year, refMonth]);
  const paidMonths = useMemo(() => monthTotals(state, year, false), [state, year]);
  const invoicedMonths = useMemo(() => monthTotals(state, year, true), [state, year]);
  const dist = useMemo(
    () => sourceDistribution(state, year, showInvoiced),
    [state, year, showInvoiced],
  );

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: C.faint }}>Loading…</Text>
      </View>
    );
  }

  const years = financeYears(state);
  const yi = years.indexOf(year);
  const base = state.baseCurrency;
  const p = kpis.projection;
  const displayTotal = showInvoiced ? kpis.invoicedTotal : kpis.paidTotal;
  const displayProgress = showInvoiced ? kpis.progressInvoiced : kpis.progress;
  const maxMonth = Math.max(1, ...invoicedMonths);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.nav}>
        <View>
          <Text style={styles.title}>Finance</Text>
          <Text style={styles.subtitle}>Income tracker · {base}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            style={styles.yBtn}
            onPress={() => setYear(years[Math.min(years.length - 1, yi + 1)] ?? year - 1)}
          >
            <Text style={styles.navArrow}>‹</Text>
          </Pressable>
          <Text style={{ color: C.text, fontWeight: "700", fontSize: 16 }}>{year}</Text>
          <Pressable
            style={styles.yBtn}
            onPress={() => setYear(years[Math.max(0, yi - 1)] ?? year + 1)}
          >
            <Text style={styles.navArrow}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* Paid / invoiced toggle */}
      <View style={styles.toggle}>
        <Pressable
          onPress={() => setShowInvoiced(false)}
          style={[styles.toggleBtn, !showInvoiced && styles.toggleBtnOn]}
        >
          <Text style={[styles.toggleText, !showInvoiced && styles.toggleTextOn]}>Paid</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowInvoiced(true)}
          style={[styles.toggleBtn, showInvoiced && styles.toggleBtnOn]}
        >
          <Text style={[styles.toggleText, showInvoiced && styles.toggleTextOn]}>
            + Invoiced
          </Text>
        </Pressable>
      </View>

      {/* KPI hero */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <ProgressRing value={displayProgress} size={88} stroke={9} label={pct(displayProgress)} />
          <View style={{ flex: 1 }}>
            <Text style={styles.kLabel}>
              {(showInvoiced ? "Paid + invoiced" : "Received").toUpperCase()} {year}
            </Text>
            <Text style={styles.kValue} numberOfLines={1}>
              {fmtMoney(displayTotal, base)}
            </Text>
            {state.goal.target > 0 && (
              <Text style={styles.kGoal}>Goal {fmtMoney(state.goal.target, base)}</Text>
            )}
            <View
              style={[
                styles.pace,
                { backgroundColor: p.onPace ? "rgba(52,211,153,0.12)" : "rgba(245,158,11,0.12)" },
              ]}
            >
              <Text style={{ color: p.onPace ? C.accent : C.amber, fontSize: 12, fontWeight: "600" }}>
                {p.onPace ? "On pace" : "Behind pace"}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* KPI grid */}
      <View style={styles.grid}>
        <Mini label="Level" value={kpis.level?.name ?? "—"} color={C.accent2} />
        <Mini label="Best month" value={kpis.best ? kpis.best.label : "—"} />
      </View>
      <View style={styles.grid}>
        <Mini label="Projected year" value={fmtMoney(p.projected, base)} />
        <Mini label="On target" value={`${kpis.monthsOnTarget}/12`} />
      </View>

      {kpis.next && (
        <Card style={{ padding: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ color: C.dim, fontSize: 12 }}>Next level · {kpis.next.name}</Text>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: "600" }}>
              {fmtMoney(kpis.trailingAvg, base)} / {fmtMoney(kpis.next.min, base)}
            </Text>
          </View>
          <Bar
            value={kpis.next.min ? kpis.trailingAvg / kpis.next.min : 0}
            color={C.accent2}
          />
          <Text style={{ color: C.faint, fontSize: 10, marginTop: 4 }}>
            Based on your 3-month average
          </Text>
        </Card>
      )}

      {/* Monthly breakdown */}
      <Card>
        <Text style={styles.sectionTitle}>By month</Text>
        {MONTH_SHORT.map((m, i) => {
          const paid = paidMonths[i];
          const invoiced = invoicedMonths[i];
          const pending = Math.max(0, invoiced - paid);
          return (
            <View key={m} style={styles.monthRow}>
              <Text style={styles.monthLabel}>{m}</Text>
              <View style={styles.monthBarTrack}>
                <View
                  style={{
                    height: "100%",
                    width: `${(paid / maxMonth) * 100}%`,
                    backgroundColor: C.accent,
                  }}
                />
                <View
                  style={{
                    height: "100%",
                    width: `${(pending / maxMonth) * 100}%`,
                    backgroundColor: C.accent,
                    opacity: 0.4,
                  }}
                />
              </View>
              <Text style={styles.monthValue}>
                {invoiced > 0 ? fmtMoney(invoiced, base) : "—"}
              </Text>
            </View>
          );
        })}
        <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
          <Legend color={C.accent} label="Paid" />
          <Legend color={C.accent} label="Invoiced" opacity={0.4} />
        </View>
      </Card>

      {/* Source distribution */}
      {dist.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>By source</Text>
          {dist.map((s) => (
            <View key={s.sourceId} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: s.color }} />
                  <Text style={{ color: C.text, fontSize: 12 }}>{s.name}</Text>
                </View>
                <Text style={{ color: C.dim, fontSize: 12 }}>
                  {fmtMoney(s.total, base)} · {pct(s.share)}
                </Text>
              </View>
              <Bar value={s.share} color={s.color} />
            </View>
          ))}
        </Card>
      )}

      {/* Recent transactions */}
      <RecentTransactions />

      {/* Quick add */}
      <QuickAdd />

      {/* Settings */}
      <Settings />
    </ScrollView>
  );
}

function Mini({ label, value, color = C.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.mini}>
      <Text style={{ color: C.faint, fontSize: 10, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
      <Text style={{ color, fontSize: 16, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: C.elev2, overflow: "hidden" }}>
      <View
        style={{ height: 6, width: `${Math.min(100, value * 100)}%`, backgroundColor: color, borderRadius: 3 }}
      />
    </View>
  );
}

function Legend({ color, label, opacity = 1 }: { color: string; label: string; opacity?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, opacity }} />
      <Text style={{ color: C.faint, fontSize: 10 }}>{label}</Text>
    </View>
  );
}

function RecentTransactions() {
  const state = useFinanceState();
  const sources = new Map(state.sources.map((s) => [s.id, s]));
  const recent = [...state.transactions]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 8);

  if (recent.length === 0) return null;

  return (
    <Card>
      <Text style={styles.sectionTitle}>Recent</Text>
      {recent.map((t) => {
        const src = sources.get(t.sourceId);
        return (
          <View key={t.id} style={styles.txRow}>
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: src?.color ?? C.faint }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                {src?.name ?? "—"}
              </Text>
              <Text style={{ color: C.faint, fontSize: 11 }}>
                {t.date} ·{" "}
                <Text style={{ color: t.status === "paid" ? C.accent : C.amber }}>{t.status}</Text>
                {t.note ? ` · ${t.note}` : ""}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: "700" }}>
                {fmtMoney(t.amount, t.currency)}
              </Text>
              {t.currency !== state.baseCurrency && (
                <Text style={{ color: C.faint, fontSize: 10 }}>
                  ≈ {fmtMoney(txBase(state, t), state.baseCurrency)}
                  {t.fxRate ? ` @ ${Number(t.fxRate.toFixed(2))}` : ""}
                </Text>
              )}
            </View>
            <Pressable onPress={() => financeActions.deleteTransaction(t.id)} hitSlop={8}>
              <Text style={{ color: C.faint, fontSize: 20, paddingHorizontal: 4 }}>×</Text>
            </Pressable>
          </View>
        );
      })}
    </Card>
  );
}

function QuickAdd() {
  const state = useFinanceState();
  const [open, setOpen] = useState(false);
  const activeSources = state.sources.filter((s) => !s.archived);
  const [sourceId, setSourceId] = useState(activeSources[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [date, setDate] = useState(todayKey());
  const [status, setStatus] = useState<"paid" | "invoiced">("paid");
  const [note, setNote] = useState("");

  const selected = activeSources.find((s) => s.id === sourceId) ?? activeSources[0];

  if (activeSources.length === 0) {
    return (
      <Card>
        <Text style={{ color: C.dim, fontSize: 13 }}>
          Add an income source in Settings to start logging income.
        </Text>
      </Card>
    );
  }

  if (!open) {
    return (
      <Pressable style={styles.addBtn} onPress={() => setOpen(true)}>
        <Text style={{ color: C.dim, fontSize: 14, fontWeight: "600" }}>+ Add income</Text>
      </Pressable>
    );
  }

  function submit() {
    const value = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return;
    const sid = sourceId || activeSources[0].id;
    const cur = (currency || selected?.currency || state.baseCurrency).toUpperCase();
    financeActions.addTransaction({
      sourceId: sid,
      amount: value,
      currency: cur,
      date,
      status,
      note: note.trim() || undefined,
    });
    setAmount("");
    setNote("");
    setOpen(false);
  }

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={styles.sectionTitle}>Add income</Text>
        <Pressable onPress={() => setOpen(false)} hitSlop={8}>
          <Text style={{ color: C.faint, fontSize: 20 }}>×</Text>
        </Pressable>
      </View>

      <Text style={styles.fieldLabel}>SOURCE</Text>
      <View style={styles.chipRow}>
        {activeSources.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => {
              setSourceId(s.id);
              setCurrency(s.currency);
            }}
            style={[styles.chip, sourceId === s.id && styles.chipOn]}
          >
            <Text style={{ color: sourceId === s.id ? C.bg : C.dim, fontSize: 13, fontWeight: "600" }}>
              {s.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>AMOUNT</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={C.faint}
        style={styles.input}
      />

      <Text style={[styles.fieldLabel, { marginTop: 6 }]}>CURRENCY</Text>
      <CurrencyChips
        value={currency || selected?.currency || state.baseCurrency}
        onChange={setCurrency}
      />

      <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>DATE</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.faint}
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>STATUS</Text>
          <View style={styles.chipRow}>
            {(["paid", "invoiced"] as const).map((st) => (
              <Pressable
                key={st}
                onPress={() => setStatus(st)}
                style={[styles.chip, status === st && styles.chipOn]}
              >
                <Text style={{ color: status === st ? C.bg : C.dim, fontSize: 13, fontWeight: "600" }}>
                  {st}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 4 }]}>NOTE (OPTIONAL)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="e.g. October invoice"
        placeholderTextColor={C.faint}
        style={styles.input}
      />

      <Pressable style={styles.saveBtn} onPress={submit}>
        <Text style={{ color: C.bg, fontWeight: "700", fontSize: 15 }}>Save</Text>
      </Pressable>
    </Card>
  );
}

function CurrencyChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {SUPPORTED_CURRENCIES.map((c) => (
        <Pressable
          key={c.code}
          onPress={() => onChange(c.code)}
          style={[styles.chip, value === c.code && styles.chipOn]}
        >
          <Text
            style={{
              color: value === c.code ? C.bg : C.dim,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {c.code}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Settings() {
  const state = useFinanceState();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(String(state.goal.target || ""));
  const [name, setName] = useState("");
  const [srcCurrency, setSrcCurrency] = useState(state.baseCurrency);

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} style={{ alignItems: "center", paddingVertical: 8 }}>
        <Text style={{ color: C.faint, fontSize: 12 }}>Settings</Text>
      </Pressable>
    );
  }

  const fxCodes = Array.from(
    new Set(state.sources.map((s) => s.currency).filter((c) => c !== state.baseCurrency)),
  );

  function saveGoal() {
    const value = parseFloat(target.replace(",", ".")) || 0;
    financeActions.setGoal({ ...state.goal, target: value });
  }

  function addSource() {
    if (!name.trim()) return;
    const palette = ["#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#f59e0b", "#22d3ee"];
    financeActions.addSource({
      name: name.trim(),
      color: palette[state.sources.length % palette.length],
      currency: (srcCurrency || state.baseCurrency).toUpperCase(),
    });
    setName("");
  }

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <Pressable onPress={() => setOpen(false)} hitSlop={8}>
          <Text style={{ color: C.faint, fontSize: 20 }}>×</Text>
        </Pressable>
      </View>

      {/* Totals currency */}
      <Text style={[styles.fieldLabel, { marginBottom: 6 }]}>TOTALS CURRENCY</Text>
      <CurrencyChips value={state.baseCurrency} onChange={financeActions.setBaseCurrency} />
      <Text style={{ color: C.faint, fontSize: 10, marginTop: 4 }}>
        All totals and goals use this currency.
      </Text>

      <View style={styles.divider} />

      {/* Goal + direction */}
      <Text style={styles.fieldLabel}>YEARLY TARGET ({state.baseCurrency})</Text>
      <TextInput
        value={target}
        onChangeText={setTarget}
        onBlur={saveGoal}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={C.faint}
        style={styles.input}
      />
      <View style={[styles.chipRow, { marginTop: 6 }]}>
        {(["reach", "not_exceed"] as const).map((d) => (
          <Pressable
            key={d}
            onPress={() =>
              financeActions.setGoal({
                ...state.goal,
                target: parseFloat(target.replace(",", ".")) || 0,
                direction: d,
              })
            }
            style={[styles.chip, state.goal.direction === d && styles.chipOn]}
          >
            <Text
              style={{
                color: state.goal.direction === d ? C.bg : C.dim,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {d === "reach" ? "Reach" : "Not exceed"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.divider} />

      {/* Sources */}
      <Text style={[styles.fieldLabel, { marginBottom: 6 }]}>INCOME SOURCES</Text>
      {state.sources.map((s) => (
        <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: s.color }} />
          <Text style={{ color: C.text, fontSize: 13, flex: 1 }}>{s.name}</Text>
          <Text style={{ color: C.faint, fontSize: 12 }}>{s.currency}</Text>
          <Pressable onPress={() => financeActions.deleteSource(s.id)} hitSlop={8}>
            <Text style={{ color: C.faint, fontSize: 18, paddingHorizontal: 4 }}>×</Text>
          </Pressable>
        </View>
      ))}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="New source"
          placeholderTextColor={C.faint}
          style={[styles.input, { flex: 1 }]}
        />
        <Pressable style={styles.smallBtn} onPress={addSource}>
          <Text style={{ color: C.text, fontWeight: "600" }}>Add</Text>
        </Pressable>
      </View>
      <View style={{ marginTop: 6 }}>
        <CurrencyChips value={srcCurrency} onChange={setSrcCurrency} />
      </View>

      {/* FX */}
      {fxCodes.length > 0 && (
        <>
          <View style={styles.divider} />
          <FxSection codes={fxCodes} />
        </>
      )}
    </Card>
  );
}

function FxSection({ codes }: { codes: string[] }) {
  const state = useFinanceState();
  const refreshing = useFxRefreshing();
  const lastUpdated = state.fxRates
    .filter((r) => codes.includes(r.code) && r.updatedAt)
    .map((r) => r.updatedAt as string)
    .sort()
    .pop();

  const provider = state.fxProvider ?? "general";

  return (
    <>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Text style={styles.fieldLabel}>FX RATES (1 → {state.baseCurrency})</Text>
        <Pressable
          onPress={() => financeActions.refreshFxRates(true)}
          disabled={refreshing}
          style={[styles.smallBtn, { paddingVertical: 6, opacity: refreshing ? 0.5 : 1 }]}
        >
          <Text style={{ color: C.text, fontSize: 12, fontWeight: "600" }}>
            {refreshing ? "Updating…" : "↻ Update"}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.fieldLabel}>RATES SOURCE</Text>
      <View style={[styles.chipRow, { marginBottom: 8 }]}>
        {(["general", "nbs"] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => financeActions.setFxProvider(p)}
            style={[styles.chip, provider === p && styles.chipOn]}
          >
            <Text style={{ color: provider === p ? C.bg : C.dim, fontSize: 13, fontWeight: "600" }}>
              {p === "general" ? "Automatic" : "NBS (official)"}
            </Text>
          </Pressable>
        ))}
      </View>
      {codes.map((code) => {
        const entry = state.fxRates.find((r) => r.code === code);
        const rate = entry?.rate ?? 1;
        return (
          <View
            key={`${code}-${entry?.updatedAt ?? ""}`}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}
          >
            <Text style={{ color: C.text, fontWeight: "600", width: 48 }}>{code}</Text>
            <TextInput
              defaultValue={String(Number(rate.toFixed(4)))}
              onEndEditing={(e) =>
                financeActions.setFxRate(
                  code,
                  parseFloat(e.nativeEvent.text.replace(",", ".")) || 1,
                )
              }
              keyboardType="decimal-pad"
              style={[styles.input, { flex: 1 }]}
            />
            {entry?.manual ? (
              <Pressable onPress={() => financeActions.resetFxRate(code)} hitSlop={6}>
                <Text style={{ color: C.accent2, fontSize: 11 }}>auto</Text>
              </Pressable>
            ) : (
              <Text style={{ color: C.faint, fontSize: 11, width: 34, textAlign: "right" }}>auto</Text>
            )}
          </View>
        );
      })}
      <Text style={{ color: C.faint, fontSize: 10, marginTop: 4 }}>
        {lastUpdated
          ? `Auto-updated ${new Date(lastUpdated).toLocaleDateString()}`
          : "Rates update automatically when online"}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: C.text, fontSize: 22, fontWeight: "800" },
  subtitle: { color: C.dim, fontSize: 12, marginTop: 2 },
  yBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.elev,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrow: { color: C.text, fontSize: 18 },
  toggle: {
    flexDirection: "row",
    alignSelf: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.elev,
    padding: 4,
  },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  toggleBtnOn: { backgroundColor: C.elev2 },
  toggleText: { color: C.faint, fontSize: 13, fontWeight: "600" },
  toggleTextOn: { color: C.text },
  kLabel: { color: C.faint, fontSize: 10, letterSpacing: 0.5 },
  kValue: { color: C.text, fontSize: 24, fontWeight: "800", marginTop: 2 },
  kGoal: { color: C.dim, fontSize: 12, marginTop: 2 },
  pace: { alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  grid: { flexDirection: "row", gap: 8 },
  mini: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.elev,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionTitle: { color: C.dim, fontSize: 13, fontWeight: "700", marginBottom: 10 },
  monthRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  monthLabel: { color: C.faint, fontSize: 12, width: 32 },
  monthBarTrack: {
    flex: 1,
    height: 16,
    borderRadius: 4,
    backgroundColor: C.elev2,
    overflow: "hidden",
    flexDirection: "row",
  },
  monthValue: { color: C.text, fontSize: 12, width: 92, textAlign: "right" },
  txRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.border },
  addBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.border,
    backgroundColor: C.elev,
    paddingVertical: 14,
    alignItems: "center",
  },
  fieldLabel: { color: C.faint, fontSize: 10, letterSpacing: 0.5, marginBottom: 4, fontWeight: "600" },
  input: {
    backgroundColor: C.elev2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 15,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.elev2,
  },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  saveBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  smallBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.elev2,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
});
