/**
 * The store contact details a customer may see, read from the saved
 * "Contact & invoice details" settings (docs/VAT.md). An empty string means
 * staff have not filled the field, and nothing is shown for it.
 */
export interface ContactDetails {
  email: string;
  /** Stored form, e.g. `+971501234567`. */
  phone: string;
  /** Stored form, e.g. `+971501234567`. */
  whatsapp: string;
  /** Free text in Gulf time; one line per row. */
  hours: string;
}
