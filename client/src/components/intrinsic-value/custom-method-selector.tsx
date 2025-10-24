import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export type CustomBasedOn = 'ocf' | 'fcf' | 'ni';

interface CustomMethodSelectorProps {
  value: CustomBasedOn;
  onChange: (value: CustomBasedOn) => void;
}

/**
 * Custom Method Selector Component
 *
 * Provides a dropdown to select the base cash flow metric for Custom DCF calculations.
 * Options: Operating Cash Flow (OCF), Free Cash Flow (FCF), Net Income (NI)
 *
 * Inspired by StockOracle's Custom method implementation.
 *
 * @example
 * ```tsx
 * <CustomMethodSelector
 *   value={customBasedOn}
 *   onChange={setCustomBasedOn}
 * />
 * ```
 */
export function CustomMethodSelector({ value, onChange }: CustomMethodSelectorProps) {
  return (
    <div className="space-y-2 mt-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <Label htmlFor="custom-based-on" className="text-sm font-medium">
          Based On
        </Label>
        <HoverCard>
          <HoverCardTrigger>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Choose your cash flow basis:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <span className="font-medium">OCF</span>: Cash from core operations (most conservative)</li>
                <li>• <span className="font-medium">FCF</span>: OCF minus CapEx (recommended)</li>
                <li>• <span className="font-medium">NI</span>: Accounting profit (least conservative)</li>
              </ul>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="custom-based-on" className="w-full">
          <SelectValue placeholder="Select cash flow type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ocf">
            <div className="flex flex-col items-start">
              <span className="font-medium">Operating Cash Flow (OCF)</span>
              <span className="text-xs text-muted-foreground">Most conservative approach</span>
            </div>
          </SelectItem>
          <SelectItem value="fcf">
            <div className="flex flex-col items-start">
              <span className="font-medium">Free Cash Flow (FCF)</span>
              <span className="text-xs text-muted-foreground">Recommended for most stocks</span>
            </div>
          </SelectItem>
          <SelectItem value="ni">
            <div className="flex flex-col items-start">
              <span className="font-medium">Net Income (NI)</span>
              <span className="text-xs text-muted-foreground">Accounting-based approach</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Visual feedback badge */}
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="secondary" className="text-xs">
          Using {value.toUpperCase()} for DCF calculation
        </Badge>
        {value === 'fcf' && (
          <Badge variant="outline" className="text-xs text-green-600 border-green-600">
            Recommended
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        The selected metric will be used as the base for 20-year discounted cash flow projections.
        Different metrics can yield significantly different intrinsic values.
      </p>
    </div>
  );
}
