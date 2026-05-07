export const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

export function optionLabel(idx) {
  return OPTION_KEYS[idx] ?? String(idx + 1);
}

export function correctIndex(answer) {
  return Number(answer) - 1;
}
