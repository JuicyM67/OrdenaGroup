// Se DESIGN.md §7 "Byggt i WP-12". `top` är den enda geometrin som räknas ur data (D-021) —
// vänster/höger/prickens läge är konstanter ur referensen och skrivs som klasser.
export type NowLineProps = { top: number };

export function NowLine({ top }: NowLineProps) {
  return (
    <div
      aria-hidden="true"
      className="absolute right-0 -left-1.25 h-0.5 bg-alert"
      style={{ top }}
    >
      <span className="absolute -top-1 left-0 size-2.5 rounded-full bg-alert" />
    </div>
  );
}
