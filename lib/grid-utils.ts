export const GRID_COLUMNS = 3;

/**
 * Number of blank filler cells needed between the last real item and a
 * trailing CTA so the CTA always lands at the end of the last row.
 *
 * `itemCount` should NOT include the CTA — this accounts for it internally.
 */
export function getBlankCount(
  itemCount: number,
  columns: number = GRID_COLUMNS,
): number {
  return (columns - ((itemCount + 1) % columns)) % columns;
}
