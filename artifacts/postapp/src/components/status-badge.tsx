import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let className = "";
  let label = status.replace(/-/g, " ").toUpperCase();

  switch (status) {
    case "draft":
      variant = "outline";
      className = "text-muted-foreground border-muted-foreground/30 bg-muted/20 font-mono text-[10px]";
      break;
    case "in-review":
      variant = "secondary";
      className = "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20 font-mono text-[10px]";
      break;
    case "needs-revision":
      variant = "destructive";
      className = "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20 font-mono text-[10px]";
      break;
    case "ready-for-submission":
      variant = "default";
      className = "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/20 font-mono text-[10px]";
      break;
    case "approved":
      variant = "default";
      className = "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 font-mono text-[10px]";
      break;
    default:
      variant = "outline";
      className = "font-mono text-[10px]";
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
