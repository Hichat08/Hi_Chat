import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakBadgeProps {
  count?: number;
  className?: string;
}

const StreakBadge = ({ count = 0, className }: StreakBadgeProps) => {
  if (!count || count <= 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-600",
        className
      )}
    >
      <Flame className="size-3.5 fill-orange-500 text-orange-500" />
      {count}
    </span>
  );
};

export default StreakBadge;
