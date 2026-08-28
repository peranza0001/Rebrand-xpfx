import Decimal from "decimal.js-light";

export function money(value: number | string | Decimal): Decimal {
  return new Decimal(value);
}

export function moneyToNumber(value: number | string | Decimal): number {
  return money(value).toDecimalPlaces(2).toNumber();
}

export function addMoney(left: number | string | Decimal, right: number | string | Decimal): number {
  return moneyToNumber(money(left).plus(right));
}

export function subtractMoney(left: number | string | Decimal, right: number | string | Decimal): number {
  return moneyToNumber(money(left).minus(right));
}

export function multiplyMoney(left: number | string | Decimal, right: number | string | Decimal): number {
  return moneyToNumber(money(left).times(right));
}

export function adjustMoney(balance: number | string | Decimal, delta: number | string | Decimal): number {
  return moneyToNumber(money(balance).plus(delta));
}
