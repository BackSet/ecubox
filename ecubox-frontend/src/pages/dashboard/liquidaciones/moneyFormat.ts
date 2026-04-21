export const formatMoney = (value?: number | null): string => {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `$${n.toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatNumber = (value?: number | null, decimals = 2): string => {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return n.toLocaleString('es-EC', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
