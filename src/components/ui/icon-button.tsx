import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";

interface IconButtonProps extends Omit<ButtonProps, "size"> {
  "aria-label": string;
}

export function IconButton(props: IconButtonProps) {
  return <Button size="icon" variant="ghost" {...props} />;
}
