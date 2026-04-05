/**
 * Variable alias layer for backward compatibility.
 * Maps old variable names to their canonical equivalents.
 * The applyAliases() function ensures both old and new names
 * are present in the variable record.
 */

import type { VariableRecord } from '../services/template-engine';

/**
 * Old name → new canonical name.
 * Both names will be emitted in the variable record.
 */
export const VARIABLE_ALIASES: Record<string, string> = {
  // Bank details table aliases (old TABLE suffix → new without)
  'ALLOWED_LENDER_DISBURSEMENT_ACCOUNTS_TABLE': 'ALLOWED_LENDER_DISBURSEMENT_ACCOUNTS',
  'ALLOWED_BORROWER_RECEIVING_ACCOUNTS_TABLE': 'ALLOWED_BORROWER_RECEIVING_ACCOUNTS',
  'ALLOWED_LENDER_RECEIVING_ACCOUNTS_TABLE': 'ALLOWED_LENDER_RECEIVING_ACCOUNTS',

  // TZ v2.2 renames: SIGNATURE_MODE → split into two fields
  'SIGNATURE_MODE': 'SIGNATURE_SCHEME_REQUESTED',
};

/**
 * Variables that are deprecated but still recognized.
 * They will resolve via the alias map.
 */
export const DEPRECATED_VARIABLES = new Set(Object.keys(VARIABLE_ALIASES));

/**
 * Apply aliases to a variable record.
 * For each alias pair (old→new):
 * - If old exists but new doesn't, copy old→new
 * - If new exists but old doesn't, copy new→old
 * This ensures templates using either name will resolve correctly.
 */
export function applyAliases(vars: VariableRecord): VariableRecord {
  const result = { ...vars };

  for (const [oldName, newName] of Object.entries(VARIABLE_ALIASES)) {
    if (result[oldName] !== undefined && result[newName] === undefined) {
      result[newName] = result[oldName];
    } else if (result[newName] !== undefined && result[oldName] === undefined) {
      result[oldName] = result[newName];
    }
  }

  return result;
}

/**
 * Check if a variable name is a deprecated alias.
 */
export function isDeprecatedVariable(name: string): boolean {
  return DEPRECATED_VARIABLES.has(name);
}

/**
 * Resolve a variable name through aliases to its canonical form.
 */
export function resolveAlias(name: string): string {
  return VARIABLE_ALIASES[name] ?? name;
}
