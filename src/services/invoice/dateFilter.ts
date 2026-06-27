import { isDateInBillingRange } from "@/utils/date";
import type { DelhiveryShipment } from "@/types";

/** Filters by pickup date only, preserving original CSV order. */
export function filterByPickupDate(
  shipments: DelhiveryShipment[],
  from: Date,
  to: Date,
): DelhiveryShipment[] {
  return shipments.filter((shipment) =>
    isDateInBillingRange(shipment.pickupDate, from, to),
  );
}
