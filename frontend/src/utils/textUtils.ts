/**
 * Text-Utilities für sichere Anzeige
 */

/**
 * Entfernt HTML-Tags aus einem String für sichere Textanzeige.
 * Verhindert, dass rohe HTML-Tags (z.B. <p>, <strong>) als Text sichtbar werden.
 * @param html - String der ggf. HTML enthält
 * @returns Bereinigter Klartext ohne HTML-Tags
 */
export const stripHtmlTags = (html: string): string => {
  if (!html || typeof html !== 'string') return '';
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]*>/g, '');
  }
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};
