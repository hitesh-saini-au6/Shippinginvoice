import { isDateInBillingRange } from "@/utils/date";
import type { DelhiveryShipment } from "@/types";

/** Filters by pickup date only. */
export function filterByPickupDate(
  shipments: DelhiveryShipment[],
  from: Date,
  to: Date,
): DelhiveryShipment[] {
  return shipments.filter((shipment) =>
    isDateInBillingRange(shipment.pickupDate, from, to),
  );
}

/** Sorts by pickup date ascending; same-day rows keep original CSV order. */
export function sortByPickupDate(
  shipments: DelhiveryShipment[],
): DelhiveryShipment[] {
  return shipments
    .map((shipment, index) => ({ shipment, index }))
    .sort((a, b) => {
      const dateDiff =
        a.shipment.pickupDate.getTime() - b.shipment.pickupDate.getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return a.index - b.index;
    })
    .map(({ shipment }) => shipment);
}
