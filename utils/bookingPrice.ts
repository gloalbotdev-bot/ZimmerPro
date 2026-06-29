import { ZimmerUnit } from '../types';

export const calculateTotalPrice = (
  unit: ZimmerUnit | undefined,
  checkIn: string,
  checkOut: string
): number => {
  if (!unit || !checkIn || !checkOut) return 0;

  const checkInDate = new Date(checkIn + 'T00:00:00');
  const checkOutDate = new Date(checkOut + 'T00:00:00');
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  if (nights <= 0) return 0;

  let totalPrice = 0;
  const basePrice = unit.pricePerNight || 0;

  for (let i = 0; i < nights; i++) {
    const currentDate = new Date(checkInDate);
    currentDate.setDate(checkInDate.getDate() + i);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    let priceForNight = basePrice;
    if (unit.specialPrices?.length) {
      for (const specialPrice of unit.specialPrices) {
        if (specialPrice.startDate && specialPrice.endDate) {
          if (dateStr >= specialPrice.startDate && dateStr <= specialPrice.endDate) {
            priceForNight = specialPrice.pricePerNight || basePrice;
            break;
          }
        }
      }
    }
    totalPrice += priceForNight;
  }

  return totalPrice;
};
