/** Splits a name into lowercase tokens for fuzzy client/provider matching. */
export function tokenizeName(name: string): string[] {
   return name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
}
