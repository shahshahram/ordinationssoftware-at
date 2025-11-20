// Gemeinsamer Typ für Medikamente
// Unterstützt sowohl Katalog-Einträge als auch freie Einträge

export interface Medication {
  // Katalog-Eintrag (optional, bei freien Einträgen nicht vorhanden)
  _id?: string;
  
  // Gemeinsame Felder
  name: string;
  designation?: string;
  activeIngredient?: string;
  strength?: string;
  strengthUnit?: string;
  form?: string;
  atcCode?: string;
  requiresPrescription?: boolean;
  
  // Freitext-Felder, die in bestehenden Formularen verwendet werden
  dosage?: string;
  frequency?: string;
  startDate?: string;
  prescribedBy?: string;
}






