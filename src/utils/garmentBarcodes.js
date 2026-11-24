const BARCODE_FORMAT = 'CODE128';

export const BARCODE_RENDER_OPTIONS = {
  format: BARCODE_FORMAT,
  width: 2,
  height: 80,
  margin: 15,
  displayValue: true,
  background: '#ffffff',
  lineColor: '#000000',
  fontSize: 14,
  textMargin: 8,
};

const stringValue = (value) => String(value ?? '').trim();

export const normalizeBarcodeValue = (value) => stringValue(value).toUpperCase().replace(/\s+/g, '');

export const getOrderIdFromBarcode = (value) => {
  const normalized = normalizeBarcodeValue(value);
  if (!normalized) return '';
  return normalized.replace(/-G\d+$/, '');
};

export function assignGarmentBarcodes({ orderId, inspections = {} }) {
  const source = inspections && typeof inspections === 'object' ? inspections : {};
  const cleanOrderId = stringValue(orderId).toUpperCase().replace(/\s+/g, '-');
  if (!cleanOrderId) return { inspections: source, barcodes: [] };

  const prefix = `${cleanOrderId}-G`;
  const used = new Set();
  const nextInspections = { ...source };
  const barcodes = [];
  const generatedAt = new Date().toISOString();

  Object.entries(source).forEach(([key, detail], index) => {
    if (!detail) return;

    const existing = normalizeBarcodeValue(detail.barcode || detail.garment_barcode);
    const garmentDbId = stringValue(detail.card_id || detail.garment_id || detail.barcode_garment_id || detail.id || key);
    const unitIndex = Number(detail.unit_index ?? detail.piece ?? index + 1) || index + 1;
    const preferred = `${prefix}${String(unitIndex).padStart(3, '0')}`;

    let barcode = existing && existing.startsWith(prefix) ? existing : preferred;
    if (used.has(barcode)) {
      let candidate = unitIndex;
      do {
        candidate += 1;
        barcode = `${prefix}${String(candidate).padStart(3, '0')}`;
      } while (used.has(barcode));
    }
    used.add(barcode);

    const nextDetail = {
      ...detail,
      barcode,
      garment_barcode: barcode,
      barcode_format: BARCODE_FORMAT,
      barcode_order_id: cleanOrderId,
      garment_id: garmentDbId,
      barcode_garment_id: garmentDbId,
      unit_index: unitIndex,
      barcode_generated_at: detail.barcode_generated_at || generatedAt,
    };
    nextInspections[key] = nextDetail;
    barcodes.push({
      orderId: cleanOrderId,
      garmentId: garmentDbId,
      unitIndex,
      garmentName: detail.name || '',
      piece: detail.piece ?? unitIndex,
      barcode,
      format: BARCODE_FORMAT,
    });
  });

  return { inspections: nextInspections, barcodes };
}

export function mergeGarmentBarcodePatch(inspections = {}, patch = {}) {
  const next = { ...(inspections || {}) };
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (!value) return;
    const merged = { ...(next[key] || {}) };
    Object.entries(value).forEach(([field, fieldValue]) => {
      if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
        merged[field] = fieldValue;
      }
    });
    if (value.barcode) {
      merged.barcode = value.barcode;
      merged.garment_barcode = value.barcode;
    }
    next[key] = merged;
  });
  return next;
}

export function getGarmentBarcodeEntries({ cart = [], inspections = {} }) {
  const entries = [];
  cart.forEach((item) => {
    const qty = Math.max(1, parseInt(item.qty ?? item.quantity ?? item.count, 10) || 1);
    for (let piece = 1; piece <= qty; piece += 1) {
      const key = `${item.id}-piece-${piece}`;
      const detail = inspections[key]
        || Object.entries(inspections).find(([inspectionKey, value]) => value
          && (
            String(value.cartItemId ?? value.productId ?? '') === String(item.id)
            || inspectionKey === key
            || String(value.id || '').startsWith(`${item.id}-piece-`)
          )
          && Number(value.piece ?? value.unit_index) === piece)?.[1]
        || {};
      const barcode = normalizeBarcodeValue(detail.barcode || detail.garment_barcode);
      entries.push({
        key,
        detail,
        cartItem: item,
        garmentName: detail.name || item.name || 'Garment',
        piece: Number(detail.unit_index ?? detail.piece ?? piece),
        barcode,
        garmentId: detail.garment_id || detail.barcode_garment_id || detail.card_id || detail.id || key,
      });
    }
  });
  return entries;
}
