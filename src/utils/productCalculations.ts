export const calculateVolumeM3 = (
  lengthM?: number,
  widthM?: number,
  heightM?: number
): number | null => {
  if (
    lengthM == null ||
    widthM == null ||
    heightM == null ||
    lengthM <= 0 ||
    widthM <= 0 ||
    heightM <= 0
  ) {
    return null;
  }

  return lengthM * widthM * heightM;
};

export const calculateAccumulation = (
  volumeM3: number,
  weightKg: number,
  quantity: number
) => ({
  volumeM3: volumeM3 * quantity,
  weightKg: weightKg * quantity,
});
