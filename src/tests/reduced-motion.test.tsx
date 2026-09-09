import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MotionPanel } from "@/components/layout/motion-panel";

describe("reduced motion", () => {
  it("uses the reduced transition variant when requested", () => {
    window.matchMedia = (query: string): MediaQueryList => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    });

    render(
      <MotionPanel screenKey="test">
        <p>Reduced content</p>
      </MotionPanel>
    );

    expect(screen.getByText("Reduced content").parentElement).toHaveAttribute(
      "data-motion",
      "reduced"
    );
  });
});
