import type { RouteStop } from '../types/route';

export const renumberStops = (stops: RouteStop[]): RouteStop[] =>
  stops.map((stop, index) => ({
    ...stop,
    sequenceOrder: index + 1,
  }));

export const countMissingCoordinates = (stops: RouteStop[]): number =>
  stops.filter((stop) => !stop.hasCoordinates).length;

export const getActivateButtonState = (
  stopCount: number
): {
  disabled: boolean;
  tooltip?: string;
} => {
  if (stopCount === 0) {
    return {
      disabled: true,
      tooltip: "Chưa có điểm dừng nào",
    };
  }

  if (stopCount === 1) {
    return {
      disabled: true,
      tooltip: "Cần ít nhất 2 điểm dừng",
    };
  }

  return {
    disabled: false,
  };
};
