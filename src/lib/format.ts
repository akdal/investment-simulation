/**
 * 금액을 억/만 단위로 포맷 (억원만 소수점 1자리, 만원은 정수)
 */
export const fmtMoney = (n: number): string => {
  if (n >= 100_000_000) {
    const billions = n / 100_000_000;
    const rounded = Math.round(billions * 10) / 10;
    return rounded % 1 === 0
      ? `${rounded.toLocaleString()}억원`
      : `${rounded.toFixed(1)}억원`;
  } else if (n >= 10_000) {
    const tenThousands = Math.round(n / 10_000);
    return `${tenThousands.toLocaleString()}만원`;
  }
  return `${n.toLocaleString()}원`;
};

/**
 * 숫자를 로케일 형식으로 포맷
 */
export const fmt = (n: number): string => n.toLocaleString();

/**
 * 퍼센트 포맷 (소수점 1자리)
 */
export const fmtPercent = (n: number): string => `${n.toFixed(1)}%`;
