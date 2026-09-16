import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompletionScreen } from "@/components/interview/screens/completion-screen";

describe("completion screen", () => {
  it("shows the participant code once the server has the answers", () => {
    render(<CompletionScreen participantCode="P014" />);

    expect(screen.getByText("P014")).toBeInTheDocument();
    expect(
      screen.queryByText(/have not reached the researcher yet/i)
    ).not.toBeInTheDocument();
  });

  it("warns when the answers never reached the server", () => {
    // Without this the participant sees an ordinary thank-you screen and
    // has no way to know their answers are still only on this device.
    render(<CompletionScreen participantCode={null} unsynced />);

    expect(
      screen.getByText(/have not reached the researcher yet/i)
    ).toBeInTheDocument();
  });

  it("stays quiet while a submission is still in flight", () => {
    render(<CompletionScreen participantCode={null} />);

    expect(
      screen.queryByText(/have not reached the researcher yet/i)
    ).not.toBeInTheDocument();
  });
});
