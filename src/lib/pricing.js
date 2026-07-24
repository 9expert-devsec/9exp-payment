/**
 * Quotation pricing. Every number that appears on the PDF comes from here.
 *
 * THE MODEL IS VAT-INCLUSIVE. `course.sellPrice` is what the customer actually
 * pays, VAT already inside it. The ex-VAT figure is DERIVED, never stored:
 *   exVat = sellPrice - (sellPrice / 107 * 7)
 * Do not "fix" this into the more familiar pre-tax + 7% model — it would change
 * every total on every historical document.
 *
 * ARITHMETIC IS DONE IN INTEGER SATANG, not floats. A quotation is an accounting
 * document, and 0.1 + 0.2 !== 0.3 is not an acceptable failure mode on one.
 * Working in integers makes `subtotal + vatAmount === total` true by
 * construction rather than true by epsilon-nudging a float comparison.
 *
 * ROUNDING ORDER (deliberate, do not reorder):
 *   1. unitPriceExVat  — rounded first
 *   2. subtotal        — rounded unit x seats, so the PRINTED line item
 *                        multiplies out: unitPrice x qty === amount exactly.
 *                        An accountant checking the row by hand must not find a
 *                        one-satang discrepancy.
 *   3. total           — unit incl. VAT x seats
 *   4. vatAmount       — DERIVED as total - subtotal, never rounded
 *                        independently. Independent rounding is exactly what
 *                        produces off-by-one-satang rows.
 */

const VAT_RATE = 0.07;
const VAT_DIVISOR = 107; // sellPrice is 107% of the ex-VAT price
const VAT_NUMERATOR = 7;

/** Round a value to whole satang and return it as an integer count of satang. */
function toSatang(value) {
  // The +Number.EPSILON nudge protects the classic 1.005-style case where the
  // float sits a hair below the .5 boundary and Math.round truncates downward.
  return Math.round((Number(value) || 0) * 100 + Number.EPSILON);
}

/** Convert an integer satang count back to a 2-decimal baht number. */
function toBaht(satang) {
  return satang / 100;
}

/**
 * Compute the full pricing block for a quotation line.
 *
 * @param {object} course  A Course document or a Quotation course snapshot.
 *                         Reads only `price` (list) and `sellPrice` (incl. VAT).
 * @param {number} seats   Integer seat count (>= 1).
 * @returns {{unitPriceExVat: number, seats: number, subtotal: number,
 *            vatRate: number, vatAmount: number, total: number,
 *            promoSavings: number, currency: string}}
 *          Shape matches `pricingSchema` in src/models/Quotation.js exactly.
 */
export function computePricing(course, seats) {
  const qty = Math.max(1, Math.trunc(Number(seats) || 1));

  const unitInclVat = Number(course?.sellPrice) || 0;
  const listPrice = Number(course?.price) || 0;

  // 1. Ex-VAT unit price, rounded to whole satang.
  const unitExVatRaw = unitInclVat - (unitInclVat / VAT_DIVISOR) * VAT_NUMERATOR;
  const unitExVatSatang = toSatang(unitExVatRaw);

  // 2. Subtotal from the ROUNDED unit, so the printed row reconciles.
  const subtotalSatang = unitExVatSatang * qty;

  // 3. Total is the VAT-inclusive amount the customer pays.
  const totalSatang = toSatang(unitInclVat) * qty;

  // 4. VAT is whatever is left. Derived, never independently rounded.
  const vatSatang = totalSatang - subtotalSatang;

  // Promotional saving vs. the list price. Never negative: a sellPrice above
  // the list price is a data-entry mistake, not a negative discount.
  const savingPerSeatSatang = Math.max(
    0,
    toSatang(listPrice) - toSatang(unitInclVat)
  );

  return {
    unitPriceExVat: toBaht(unitExVatSatang),
    seats: qty,
    subtotal: toBaht(subtotalSatang),
    vatRate: VAT_RATE,
    vatAmount: toBaht(vatSatang),
    total: toBaht(totalSatang),
    promoSavings: toBaht(savingPerSeatSatang * qty),
    currency: 'THB',
  };
}
