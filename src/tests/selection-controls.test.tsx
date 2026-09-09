import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MultiSelectGroup } from "@/components/interview/multi-select-group";
import { ScaleInput } from "@/components/interview/scale-input";
import { SingleSelectGroup } from "@/components/interview/single-select-group";

const options = [
  { value: "product", label: "Product" },
  { value: "growth", label: "Growth" },
];

describe("selection controls", () => {
  it("operates a single-select option by keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <>
        <h2 id="role-label">Role</h2>
        <SingleSelectGroup
          name="role"
          options={options}
          value=""
          onValueChange={onValueChange}
          labelledBy="role-label"
        />
      </>
    );

    await user.tab();
    expect(screen.getByRole("radio", { name: "Product" })).toHaveFocus();
    await user.keyboard(" ");
    expect(onValueChange).toHaveBeenCalledWith("product");
  });

  it("returns the complete multi-select value", async () => {
    const user = userEvent.setup();
    const onValuesChange = vi.fn();
    const { rerender } = render(
      <>
        <h2 id="signals-label">Signals</h2>
        <MultiSelectGroup
          name="signals"
          options={options}
          values={[]}
          onValuesChange={onValuesChange}
          labelledBy="signals-label"
        />
      </>
    );

    await user.click(screen.getByRole("checkbox", { name: "Product" }));
    expect(onValuesChange).toHaveBeenLastCalledWith(["product"]);

    rerender(
      <>
        <h2 id="signals-label">Signals</h2>
        <MultiSelectGroup
          name="signals"
          options={options}
          values={["product"]}
          onValuesChange={onValuesChange}
          labelledBy="signals-label"
        />
      </>
    );
    await user.click(screen.getByRole("checkbox", { name: "Growth" }));
    expect(onValuesChange).toHaveBeenLastCalledWith(["product", "growth"]);
  });

  it("renders and updates an accessible scale", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <>
        <h2 id="confidence-label">Confidence</h2>
        <ScaleInput
          name="confidence"
          min={1}
          max={5}
          labelledBy="confidence-label"
          onValueChange={onValueChange}
        />
      </>
    );
    await user.click(screen.getByRole("radio", { name: "4" }));
    expect(onValueChange).toHaveBeenCalledWith(4);
  });
});
