/**
 * ELDA-SIT Wartungsfenster: Donnerstag, Freitag, Sonntag
 * Support-Hinweis: "Bitte nur an Testtagen laut Testkalender testen (i. d. R. Montag bis Mittwoch)."
 * @returns true wenn aktuell Wartungszeit (Übermittlungen können fehlschlagen)
 */
export const isEldaMaintenance = (): boolean => {
  const day = new Date().getDay(); // 0 = So, 4 = Do, 5 = Fr
  return day === 0 || day === 4 || day === 5;
};
