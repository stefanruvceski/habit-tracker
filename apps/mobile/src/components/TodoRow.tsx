import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { Todo } from "@habit/core";
import { C } from "../lib/theme";

/** A single to-do row: checkbox, title, star (priority) and delete. */
export function TodoRow({
  todo,
  onToggle,
  onStar,
  onDelete,
}: {
  todo: Todo;
  onToggle: () => void;
  onStar: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        hitSlop={6}
        style={[styles.check, { backgroundColor: todo.done ? C.accent : "transparent" }]}
      >
        {todo.done && (
          <Svg width={13} height={13} viewBox="0 0 24 24">
            <Path d="M5 13l4 4L19 7" stroke={C.bg} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        )}
      </Pressable>
      <Text
        style={[
          styles.title,
          todo.done && { color: C.faint, textDecorationLine: "line-through" },
        ]}
        numberOfLines={2}
      >
        {todo.title}
      </Text>
      <Pressable onPress={onStar} hitSlop={6}>
        <Text style={{ color: todo.priority ? C.accent2 : C.faint, fontSize: 16 }}>
          {todo.priority ? "★" : "☆"}
        </Text>
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={6}>
        <Text style={{ color: C.faint, fontSize: 20, paddingHorizontal: 2 }}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.elev,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, color: C.text, fontSize: 14 },
});
