/**
 * Document registry: maps document_type → template + renderer.
 * Will be populated in Phase 4 when templates and renderers are implemented.
 */

import { type DocumentType, DOCUMENT_TYPE_CONFIGS } from '@/legal/document-types';

export interface TemplateSection {
  readonly heading?: string;
  readonly body: string;
}

export interface DocumentTemplate {
  readonly type: DocumentType;
  readonly version: string;
  readonly title: string;
  readonly sections: readonly TemplateSection[];
  readonly variables: readonly string[];
}

export interface RenderedDocument {
  readonly type: DocumentType;
  readonly title: string;
  readonly renderedSections: readonly RenderedSection[];
}

export interface RenderedSection {
  readonly heading?: string;
  readonly body: string;
}

/** Registry of all available templates, keyed by document type. */
const templateRegistry = new Map<DocumentType, DocumentTemplate>();

export function registerTemplate(template: DocumentTemplate): void {
  templateRegistry.set(template.type, template);
}

export function getTemplate(type: DocumentType): DocumentTemplate | undefined {
  return templateRegistry.get(type);
}

export function getAvailableDocumentTypes(): DocumentType[] {
  return Array.from(templateRegistry.keys());
}

export function getDocumentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_CONFIGS[type]?.label ?? type;
}
