/** Supported booking places - each has its own services, schedule, and appointments */
export type Place = "massage" | "depilation";

export const PLACES: Place[] = ["massage", "depilation"];

export const PLACE_LABELS: Record<Place, string> = {
  massage: "Massage",
  depilation: "Depilation",
};
