/**
 * CardPreview
 * -----------
 * Renders a stylised "physical" payment card using only CSS — no images
 * required. The visual design is driven by a `CardDesign` payload (palette
 * + pattern), so the same component is reused both for design previews and
 * for showing a customer's real / pending card.
 *
 * Set `flipped` to show the back face (CVV strip + magnetic stripe). Set
 * `revealNumber` to reveal the full PAN; otherwise it is masked
 * `**** **** **** 1234`.
 */
import { type CardDesign } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Wifi } from "lucide-react";

type Props = {
  design: CardDesign;
  type: "debit" | "credit";
  brand: "visa" | "mastercard" | "amex" | "xpresspro";
  last4: string;
  holderName: string;
  expiry: string;
  flipped?: boolean;
  className?: string;
};

const PATTERN_OVERLAY: Record<CardDesign["pattern"], string> = {
  solid: "",
  gradient: "",
  mesh: "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.2),transparent_50%)]",
  waves: "bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.08)_0_10px,transparent_10px_20px)]",
  grid: "bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:20px_20px]",
  carbon: "bg-[repeating-linear-gradient(135deg,rgba(0,0,0,0.15)_0_2px,transparent_2px_6px)]",
};

export function CardPreview({
  design,
  type,
  brand,
  last4,
  holderName,
  expiry,
  flipped = false,
  className,
}: Props) {
  const isLight = design.textColor === "light";
  const text = isLight ? "text-white" : "text-slate-900";
  const subtle = isLight ? "text-white/70" : "text-slate-700";

  const background =
    design.pattern === "solid"
      ? { backgroundColor: design.primaryColor }
      : { backgroundImage: `linear-gradient(135deg, ${design.primaryColor} 0%, ${design.secondaryColor} 60%, ${design.accentColor} 100%)` };

  const display = `•••• •••• •••• ${last4}`;

  return (
    <div
      className={cn(
        "relative w-full max-w-[360px] aspect-[1.586/1] rounded-2xl shadow-xl overflow-hidden",
        text,
        className,
      )}
      style={background}
      data-testid="card-preview"
    >
      {/* Pattern overlay */}
      <div className={cn("absolute inset-0 pointer-events-none", PATTERN_OVERLAY[design.pattern])} />

      {!flipped ? (
        <div className="relative h-full p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className={cn("text-[10px] uppercase tracking-widest", subtle)}>
                XpressPro FX · {type}
              </div>
              <div className="text-sm font-semibold mt-1">
                {type === "credit" ? "Credit" : "Debit"} card
              </div>
            </div>
            <Wifi className="h-5 w-5 rotate-90 opacity-80" />
          </div>

          {/* Chip */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500 border border-yellow-700/40 shadow-inner" />
            <div className={cn("text-xs", subtle)}>{design.templateId === "custom" ? "Custom design" : "Premium"}</div>
          </div>

          <div className="font-mono text-lg md:text-xl tracking-[0.18em]">
            {display}
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <div className={cn("text-[9px] uppercase tracking-widest", subtle)}>Holder</div>
              <div className="text-xs font-semibold uppercase tracking-wider truncate max-w-[180px]">
                {holderName}
              </div>
            </div>
            <div>
              <div className={cn("text-[9px] uppercase tracking-widest", subtle)}>Expires</div>
              <div className="text-xs font-mono">{expiry}</div>
            </div>
            <div className="font-bold italic uppercase text-sm tracking-tight">{brand}</div>
          </div>
        </div>
      ) : (
        <div className="relative h-full flex flex-col justify-between">
          <div className="h-10 mt-5 bg-black/70" />
          <div className="px-5 flex items-center gap-3">
            <div className="flex-1 h-9 bg-white/85 rounded flex items-center justify-end pr-3 text-slate-900 font-mono text-sm">
              •••
            </div>
            <div className={cn("text-[10px] uppercase tracking-widest", subtle)}>CVV</div>
          </div>
          <div className={cn("px-5 pb-4 text-[10px] leading-snug", subtle)}>
            This card is property of XpressPro FX. Use is subject to the cardholder agreement.
            Lost or stolen? Contact support.
          </div>
        </div>
      )}
    </div>
  );
}
