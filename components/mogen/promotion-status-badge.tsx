import { Badge } from "@/components/ui/badge";
import { getPromotionStatusLabel } from "@/data/promotions";
import type { PromotionStatus } from "@/data/promotions";

interface PromotionStatusBadgeProps {
  status: PromotionStatus;
  isFeatured?: boolean;
}

export function PromotionStatusBadge({
  status,
  isFeatured,
}: Readonly<PromotionStatusBadgeProps>) {
  const label = getPromotionStatusLabel(status);
  const variants: Record<PromotionStatus, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    scheduled: "secondary",
    expired: "destructive",
    archived: "outline",
    draft: "outline",
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant={variants[status]} className="small-caps">
        {label}
      </Badge>
      {isFeatured && (
        <Badge variant="outline" className="small-caps text-catalyst border-catalyst">
          Featured
        </Badge>
      )}
    </div>
  );
}