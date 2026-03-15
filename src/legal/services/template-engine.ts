/**
 * Template engine for legal document generation.
 * Supports:
 * - {VARIABLE_NAME} scalar substitution
 * - [[IF {VAR} == VALUE]] ... [[ENDIF]] conditional blocks (including nested and OR conditions)
 * - {VAR[]} array-reference placeholders (rendered as inline text)
 * - render_block variables that produce multi-line text blocks
 */

export type VariableRecord = Record<string, string>;

/**
 * Resolve all [[IF ...]] / [[ENDIF]] conditional blocks.
 * Supports:
 *   [[IF {VAR} == VALUE]]
 *   [[IF {VAR} == VALUE1 or {VAR} == VALUE2]]
 * Nested conditionals are supported via recursive processing.
 */
function resolveConditionals(template: string, variables: VariableRecord): string {
  // Process from innermost outward by iterating until stable
  let result = template;
  let prevResult = '';

  const MAX_ITERATIONS = 20;
  let iteration = 0;

  while (result !== prevResult && iteration < MAX_ITERATIONS) {
    prevResult = result;
    iteration++;

    // Match innermost [[IF ...]] ... [[ENDIF]] (no nested IF inside)
    result = result.replace(
      /\[\[IF\s+(.+?)\]\]([\s\S]*?)\[\[ENDIF\]\]/g,
      (_match, condition: string, body: string) => {
        const conditionMet = evaluateCondition(condition.trim(), variables);
        return conditionMet ? body : '';
      }
    );
  }

  return result;
}

/**
 * Evaluate a condition string like:
 *   {INTEREST_MODE} == FIXED_RATE
 *   {REPAYMENT_SCHEDULE_TYPE} == INSTALLMENTS_FIXED or {REPAYMENT_SCHEDULE_TYPE} == INSTALLMENTS_VARIABLE
 */
function evaluateCondition(condition: string, variables: VariableRecord): boolean {
  // Split on " or " (case-insensitive)
  const orParts = condition.split(/\s+or\s+/i);

  return orParts.some(part => {
    const match = part.trim().match(/\{(\w+)\}\s*==\s*(\S+)/);
    if (!match) return false;

    const varName = match[1];
    const expectedValue = match[2];
    const actualValue = variables[varName] ?? '';

    return actualValue.toUpperCase() === expectedValue.toUpperCase();
  });
}

/**
 * Substitute all {VARIABLE_NAME} placeholders with values.
 * Also handles {VAR[]} array-reference syntax by stripping the [].
 */
function substituteVariables(template: string, variables: VariableRecord): string {
  return template.replace(/\{(\w+?)(\[\])?\}/g, (_match, varName: string) => {
    return variables[varName] ?? '';
  });
}

/**
 * After rendering, check for any leftover template artifacts that should not appear in final output.
 * Returns a list of issues found (empty = clean).
 */
export function validateRenderedOutput(text: string): string[] {
  const issues: string[] = [];

  // Leftover conditionals
  const conditionalMatch = text.match(/\[\[(?:IF|ENDIF)[^\]]*\]\]/g);
  if (conditionalMatch) {
    issues.push(`Unresolved conditional blocks: ${conditionalMatch.join(', ')}`);
  }

  // Leftover unresolved variable references {VAR_NAME}
  const varMatch = text.match(/\{[A-Z_]+(?:\[\])?\}/g);
  if (varMatch) {
    issues.push(`Unresolved variables: ${varMatch.join(', ')}`);
  }

  return issues;
}

/**
 * Clean up excessive blank lines left after conditional removal.
 */
function cleanWhitespace(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Main template rendering function.
 * Takes a template string and a flat variable record, returns resolved text.
 */
export function renderTemplate(template: string, variables: VariableRecord): string {
  let result = resolveConditionals(template, variables);
  result = substituteVariables(result, variables);
  result = cleanWhitespace(result);
  return result;
}
