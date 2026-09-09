interface SectionHeadingProps {
  children: string;
}

export function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}
