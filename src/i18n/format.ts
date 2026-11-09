/**
 * Interpolate `{key}` placeholders in a dictionary string.
 *
 * Lives in its own module (no dictionary imports) so client components can
 * format strings that change on the client — e.g. live progress counters —
 * without bundling every locale's dictionary.
 */
export function t(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`
  );
}
