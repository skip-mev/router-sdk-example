import BigNumber from "bignumber.js";

export function formatNumberWithCommas(str: string | number) {
  const parts = str.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function formatNumberWithoutCommas(str: string | number) {
  return str.toString().replace(/,/g, "");
}

export function getAmountWei(amount?: string, decimals = 6) {
  if (!amount || !amount) return "0";
  try {
    return new BigNumber(formatNumberWithoutCommas(amount))
      .shiftedBy(decimals ?? 6)
      .toFixed(0);
  } catch (err) {
    return "0";
  }
}
