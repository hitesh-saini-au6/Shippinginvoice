import { toInputDateValue } from "@/utils/date";
import type { DelhiveryShipment } from "@/types";

export function getPickupDateRange(shipments: DelhiveryShipment[]): {
  from: Date;
  to: Date;
} | null {
  if (shipments.length === 0) {
    return null;
  }

  const timestamps = shipments.map((shipment) =>
    shipment.pickupDate.getTime(),
  );

  return {
    from: new Date(Math.min(...timestamps)),
    to: new Date(Math.max(...timestamps)),
  };
}

export function applyPickupDateRangeToForm(
  shipments: DelhiveryShipment[],
  setValue: (field: "billingFrom" | "billingTo", value: string) => void,
): { from: string; to: string } | null {
  const range = getPickupDateRange(shipments);
  if (!range) {
    return null;
  }

  const from = toInputDateValue(range.from);
  const to = toInputDateValue(range.to);
  setValue("billingFrom", from);
  setValue("billingTo", to);
  return { from, to };
}
