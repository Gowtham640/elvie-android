import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../../core/api/client";
import { UsageQueue, UsageSummary } from "../../core/api/models";
import { Theme } from "../../core/design/theme";

function formatCount(value: number): string {
  const n = Math.round(value);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
function formatCost(value?: number | null): string {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
}
function formatHold(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}

function Row({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function UsageView({ token }: { token: string }) {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [queue, setQueue] = useState<UsageQueue | null>(null);
  const [errorText, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setSummary(await api.usageSummary(token));
      setQueue(await api.usageQueue(token).catch(() => null));
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      style={styles.root}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor={Theme.primaryText}
        />
      }
    >
      {errorText ? <Text style={{ color: Theme.failure }}>{errorText}</Text> : null}
      {summary ? (
        <View style={styles.card}>
          <Text style={styles.section}>Last 7 days</Text>
          <Row title="Tokens in" value={formatCount(summary.totals.promptTokens)} />
          <Row title="Tokens out" value={formatCount(summary.totals.completionTokens)} />
          <Row title="Cached tokens" value={formatCount(summary.totals.cacheHitTokens)} />
          <Row title="Estimated cost" value={formatCost(summary.totals.estimatedCostUsd)} />
          <Row title="Computer" value={formatHold(summary.totals.heldSeconds)} />
          <Row title="Runs" value={formatCount(summary.totals.runs)} />
        </View>
      ) : null}
      {summary?.series?.length ? (
        <View style={styles.card}>
          <Text style={styles.section}>By day</Text>
          {summary.series.map((day) => (
            <View key={day.day} style={{ marginBottom: 8 }}>
              <Text style={{ color: Theme.primaryText, fontWeight: "600" }}>{day.day}</Text>
              <Text style={{ color: Theme.secondaryText, fontSize: 12 }}>
                {formatCount(day.promptTokens)} in · {formatCount(day.completionTokens)} out ·{" "}
                {formatCost(day.estimatedCostUsd)} · {formatCount(day.runs)} runs
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {queue ? (
        <View style={styles.card}>
          <Text style={styles.section}>Right now</Text>
          <Row title="Waiting runs" value={`${queue.runs.waiting}`} />
          <Row title="Active runs" value={`${queue.runs.active}`} />
          <Row title="Failed in 24h" value={`${queue.runs.failed24h}`} />
          <Row title="Computer queue" value={`${queue.lease.waiters}`} />
          <Row title="Computer held by" value={queue.lease.holder?.botName ?? "Idle"} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.background, padding: Theme.spaceL },
  card: { backgroundColor: Theme.card, borderRadius: 16, padding: Theme.spaceM, marginBottom: 16 },
  section: { color: Theme.secondaryText, fontSize: 13, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  label: { color: Theme.primaryText },
  value: { color: Theme.secondaryText },
});
