/**
 * Template engine for legal document generation.
 * Supports:
 * - {VARIABLE_NAME} scalar substitution
 * - [[IF {VAR} == VALUE]] ... [[ENDIF]] conditional blocks (including nested and OR conditions)
 * - [При {VAR}=VALUE] single-line prefix conditionals (TZ v2.2)
 * - {VAR[]} array-reference placeholders (rendered as inline text)
 * - render_block variables that produce multi-line text blocks
 * - [[AUTO_NUM]] automatic sequential numbering (TZ v2.2)
 * - [[REF:ANCHOR_ID]] cross-references to auto-numbered items (TZ v2.2)
 * - [[REPEAT:SECTION]] repeated row rendering (TZ v2.2)
 */

export type VariableRecord = Record<string, string>;

/**
 * Structured row arrays for [[REPEAT:SECTION]] blocks.
 * Each key is a section name, value is an array of row objects.
 */
export type RepeatData = Record<string, VariableRecord[]>;

/**
 * Combined result from a resolver: scalar variables + repeat section data.
 */
export interface ResolverResult {
  variables: VariableRecord;
  repeatSections: RepeatData;
}

/**
 * Resolve all [[IF ...]] / [[ENDIF]] conditional blocks.
 * Supports:
 *   [[IF {VAR} == VALUE]]
 *   [[IF {VAR} == VALUE1 or {VAR} == VALUE2]]
 * Nested conditionals are supported via recursive processing.
 */
function resolveConditionals(template: string, variables: VariableRecord): string {
  let result = template;
  let prevResult = '';

  const MAX_ITERATIONS = 20;
  let iteration = 0;

  while (result !== prevResult && iteration < MAX_ITERATIONS) {
    prevResult = result;
    iteration++;

    // Match only innermost [[IF ...]] ... [[ENDIF]] blocks — those whose body
    // contains NO nested [[IF]]. This ensures we peel from inside out.
    result = result.replace(
      /\[\[IF\s+(.+?)\]\]((?:(?!\[\[IF\s)[\s\S])*?)\[\[ENDIF\]\]/g,
      (_match, condition: string, body: string) => {
        const conditionMet = evaluateCondition(condition.trim(), variables);
        return conditionMet ? body : '';
      }
    );
  }

  return result;
}

/**
 * Resolve [При {VAR}=VALUE] single-line prefix conditionals (TZ v2.2).
 *
 * Syntax: [При {VARIABLE_NAME}=EXPECTED_VALUE] rest of line content
 *
 * If VARIABLE_NAME equals EXPECTED_VALUE (case-insensitive), the line is kept
 * (with the prefix removed). Otherwise the entire line is removed.
 */
function resolveInlinePrefixConditionals(template: string, variables: VariableRecord): string {
  return template.replace(
    /^[ \t]*\[При \{(\w+)\}=(\S+?)\][ \t]*(.*?)$/gm,
    (_match, varName: string, expectedValue: string, restOfLine: string) => {
      const actualValue = variables[varName] ?? '';
      if (actualValue.toUpperCase() === expectedValue.toUpperCase()) {
        return restOfLine;
      }
      return '';
    }
  );
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
 * Resolve [[AUTO_NUM]] markers with sequential numbering.
 */
function resolveAutoNumbering(template: string): string {
  const counters: number[] = [0, 0, 0];

  return template.replace(
    /\[\[AUTO_NUM(?::(\d))?\]\]/g,
    (_match, levelStr?: string) => {
      const level = levelStr ? parseInt(levelStr, 10) : 1;
      const idx = Math.min(level, 3) - 1;
      counters[idx]++;
      for (let i = idx + 1; i < counters.length; i++) {
        counters[i] = 0;
      }
      return counters.slice(0, idx + 1).join('.');
    }
  );
}

/**
 * Resolve [[REF:ANCHOR_ID]] cross-references.
 */
function resolveReferences(template: string): string {
  const anchors: Record<string, string> = {};

  const withAnchors = template.replace(
    /\[\[ANCHOR:(\w+)=([^\]]+)\]\]/g,
    (_match, id: string, number: string) => {
      anchors[id] = number;
      return '';
    }
  );

  return withAnchors.replace(
    /\[\[REF:(\w+)\]\]/g,
    (_match, id: string) => {
      return anchors[id] ?? `[?${id}]`;
    }
  );
}

/**
 * Render [[REPEAT:SECTION_NAME]] blocks.
 * For each section, iterates the corresponding row array from repeatSections,
 * substituting row-level {PLACEHOLDER} values per iteration.
 *
 * CRITICAL: If a section has no rows, the entire section header + table block
 * is removed cleanly. No debug markers are emitted.
 */
function renderRepeatedRows(template: string, repeatSections: RepeatData): string {
  return template.replace(
    /\[\[REPEAT:(\w+)\]\]([\s\S]*?)\[\[END_REPEAT\]\]/g,
    (_match, sectionName: string, bodyTemplate: string) => {
      const rows = repeatSections[sectionName];

      // If section not provided or empty, remove entirely (no markers)
      if (!rows || rows.length === 0) {
        return '';
      }

      // For each row object, substitute all {PLACEHOLDER} in the body template
      return rows.map(rowVars => {
        return bodyTemplate.replace(/\{(\w+?)(\[\])?\}/g, (_m, varName: string) => {
          return rowVars[varName] ?? '';
        });
      }).join('\n');
    }
  );
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
 * Forbidden output markers that must never appear in final documents.
 */
const FORBIDDEN_MARKERS = [
  /\[нет записей в секции\s+\w+\]/g,
  /\[данные секции\s+\w+\s+не предоставлены\]/g,
  /\[реквизит[ы]?\s+.*?из APP1\]/g,
  /\[см\.\s*Приложение\s*№?\s*\d+\]/g,
  /см\. Приложение № 1/g,
  /\[не указано\]/g,
  /не указано/g,
  /\[не опубликован\]/g,
  /не опубликован/g,
  /\[ожидается подписание\]/g,
  /ожидается подписание/g,
  /\[—\]/g,
  /___________/g,
  /—\s*\(Europe\/Moscow\)/g,
  /Europe\/Moscow/g,
  /\[реквизиты не указаны\]/g,
  /\[график платежей не сформирован\]/g,
  /\[подпись не проставлена\]/g,
  /не предоставлен/g,
  /не указана/g,
  /время не зафиксировано/g,
];

/**
 * After rendering, check for any leftover template artifacts that should not appear in final output.
 * Returns a list of issues found (empty = clean).
 */
export function validateRenderedOutput(text: string): string[] {
  const issues: string[] = [];

  // Leftover block conditionals
  const conditionalMatch = text.match(/\[\[(?:IF|ENDIF)[^\]]*\]\]/g);
  if (conditionalMatch) {
    issues.push(`Нерезолвленные условные блоки: ${conditionalMatch.join(', ')}`);
  }

  // Leftover inline prefix conditionals
  const inlineCondMatch = text.match(/^\s*\[При \{[A-Z_]+\}=\S+\]/gm);
  if (inlineCondMatch) {
    issues.push(`Нерезолвленные inline-условия: ${inlineCondMatch.map(s => s.trim()).join(', ')}`);
  }

  // Leftover unresolved variable references {VAR_NAME}
  const varMatch = text.match(/\{[A-Z_]+(?:\[\])?\}/g);
  if (varMatch) {
    issues.push(`Нерезолвленные переменные: ${varMatch.join(', ')}`);
  }

  // Leftover AUTO_NUM markers
  const autoNumMatch = text.match(/\[\[AUTO_NUM(?::\d)?\]\]/g);
  if (autoNumMatch) {
    issues.push(`Нерезолвленные маркеры нумерации: ${autoNumMatch.join(', ')}`);
  }

  // Leftover REF markers
  const refMatch = text.match(/\[\[REF:\w+\]\]/g);
  if (refMatch) {
    issues.push(`Нерезолвленные ссылки: ${refMatch.join(', ')}`);
  }

  // Leftover REPEAT markers
  const repeatMatch = text.match(/\[\[(?:REPEAT|END_REPEAT)[^\]]*\]\]/g);
  if (repeatMatch) {
    issues.push(`Нерезолвленные блоки повтора: ${repeatMatch.join(', ')}`);
  }

  // Leftover legacy repeat placeholders
  const oldRepeatMatch = text.match(/\[REPEAT:\w+ — н[её] реализован\]/g);
  if (oldRepeatMatch) {
    issues.push(`Устаревшие маркеры повтора: ${oldRepeatMatch.join(', ')}`);
  }

  // Missing repeat section data markers (should no longer appear)
  const missingRepeatMatch = text.match(/\[данные секции \w+ не предоставлены\]/g);
  if (missingRepeatMatch) {
    issues.push(`Отсутствуют данные секций: ${missingRepeatMatch.join(', ')}`);
  }

  // Leftover ANCHOR markers
  const anchorMatch = text.match(/\[\[ANCHOR:[^\]]+\]\]/g);
  if (anchorMatch) {
    issues.push(`Нерезолвленные маркеры якорей: ${anchorMatch.join(', ')}`);
  }

  // Forbidden output markers
  for (const pattern of FORBIDDEN_MARKERS) {
    const matches = text.match(pattern);
    if (matches) {
      issues.push(`Запрещённые маркеры в документе: ${matches.join(', ')}`);
    }
  }

  return issues;
}

/**
 * Clean up excessive blank lines left after conditional removal.
 * Also removes orphaned section headers that precede empty REPEAT blocks.
 */
function cleanWhitespace(text: string): string {
  // Remove lines that are just "---" surrounded by blank lines (orphaned separators)
  let result = text.replace(/\n{3,}/g, '\n\n');

  // Remove empty table header lines (lines with only pipes and dashes/spaces)
  // that were left after empty REPEAT blocks removed their data rows
  result = result.replace(/^### .+\n\n(?=### |\n*$)/gm, '');

  return result.trim();
}

/**
 * Main template rendering function.
 * Takes a template string and a flat variable record, returns resolved text.
 *
 * Pipeline order:
 * 1. [[IF]] block conditionals (innermost-first peeling)
 * 2. [При {VAR}=VALUE] inline prefix conditionals
 * 3. [[REPEAT]] repeated rows (from structured RepeatData)
 * 4. {VARIABLE} substitution (scalars only)
 * 5. [[AUTO_NUM]] sequential numbering
 * 6. [[REF:ID]] cross-references
 * 7. Whitespace cleanup
 */
export function renderTemplate(template: string, variables: VariableRecord, repeatSections?: RepeatData): string {
  let result = resolveConditionals(template, variables);
  result = resolveInlinePrefixConditionals(result, variables);
  result = renderRepeatedRows(result, repeatSections || {});
  result = substituteVariables(result, variables);
  result = resolveAutoNumbering(result);
  result = resolveReferences(result);
  result = cleanWhitespace(result);
  return result;
}
