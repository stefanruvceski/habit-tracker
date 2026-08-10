import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import { Card, SectionTitle, PageHeader, ProgressRing, Stat, pct } from "./ui";

describe("pct", () => {
  test("formats fractions with sensible precision", () => {
    expect(pct(0.5)).toBe("50.0%");
    expect(pct(1)).toBe("100%");
    expect(pct(0.005)).toBe("0.50%"); // tiny non-zero → 2 decimals
    expect(pct(0)).toBe("0.0%");
  });
});

describe("ui components render", () => {
  test("Card renders children", () => {
    const { getByText } = render(<Card className="x">hello</Card>);
    expect(getByText("hello")).toBeTruthy();
  });

  test("SectionTitle renders", () => {
    const { getByText } = render(<SectionTitle>Title</SectionTitle>);
    expect(getByText("Title")).toBeTruthy();
  });

  test("PageHeader renders title, subtitle and right slot", () => {
    const { getByText } = render(
      <PageHeader title="T" subtitle="sub" right={<span>R</span>} />,
    );
    expect(getByText("T")).toBeTruthy();
    expect(getByText("sub")).toBeTruthy();
    expect(getByText("R")).toBeTruthy();
  });

  test("ProgressRing shows default percentage label and custom label", () => {
    const { getByText, rerender } = render(<ProgressRing value={0.42} />);
    expect(getByText("42%")).toBeTruthy();
    rerender(<ProgressRing value={2} label={<span>custom</span>} />); // clamps >1
    expect(getByText("custom")).toBeTruthy();
  });

  test("Stat renders label and value", () => {
    const { getByText } = render(<Stat label="Total" value="9" />);
    expect(getByText("Total")).toBeTruthy();
    expect(getByText("9")).toBeTruthy();
  });
});
