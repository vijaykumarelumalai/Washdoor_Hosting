// src/components/GarmentInspectionSection.jsx
// Dynamic Garment-by-Garment Inspection & Care Component
// Faithfully implements washdoor_dynamic_garment_inspection_preview.html with full reactivity & theme support

import React, { useState, useEffect, useRef } from 'react';
import ClothIllustration from './ClothIllustration';
import '../styles/GarmentInspection.css';

const FABRIC_OPTIONS = [
  'Select fabric',
  'Cotton',
  'Silk',
  'Wool',
  'Polyester',
  'Linen',
  'Denim',
  'Blended',
  'Other',
];

const MAKE_OPTIONS = [
  'Manufacturer / make',
  'Readymade',
  'Tailored / Custom',
  'Designer / Boutique',
  'Imported',
];

export default function GarmentInspectionSection({
  cart = [],
  inspections = {},
  onChangeInspections,
  showToast,
}) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const fileInputRefs = useRef({});

  // Synchronize cart with inspection records
  useEffect(() => {
    if (!onChangeInspections) return;

    let hasChanges = false;
    const nextInspections = { ...inspections };

    // 1. Ensure inspection record exists for each physical piece in cart
    const validPieceIds = new Set();

    cart.forEach((item) => {
      const qty = Math.max(1, parseInt(item.qty || 1, 10));
      for (let i = 0; i < qty; i++) {
        const pieceNum = i + 1;
        const pieceId = `${item.id}-piece-${pieceNum}`;
        validPieceIds.add(pieceId);

        if (!nextInspections[pieceId]) {
          hasChanges = true;
          nextInspections[pieceId] = {
            id: pieceId,
            cartItemId: item.id,
            productId: item.productId || item.id,
            piece: pieceNum,
            name: item.name || 'Garment',
            color: '',
            stains: '',
            make: '',
            brand: '',
            fabric: '',
            notes: '',
            photos: [],
            expanded: true,
          };
        } else {
          // Keep garment name synchronized
          if (nextInspections[pieceId].name !== item.name) {
            hasChanges = true;
            nextInspections[pieceId] = {
              ...nextInspections[pieceId],
              name: item.name,
            };
          }
        }
      }
    });

    // 2. Prune records for items or pieces no longer in cart
    Object.keys(nextInspections).forEach((k) => {
      if (!validPieceIds.has(k)) {
        hasChanges = true;
        delete nextInspections[k];
      }
    });

    if (hasChanges) {
      onChangeInspections(nextInspections);
    }
  }, [cart]);

  // Update specific field of a garment piece
  const handleFieldChange = (pieceId, field, value) => {
    if (!onChangeInspections) return;
    const current = inspections[pieceId] || {};
    onChangeInspections({
      ...inspections,
      [pieceId]: {
        ...current,
        [field]: value,
      },
    });
  };

  // Toggle expand / collapse of a garment card
  const toggleCardCollapse = (pieceId) => {
    if (!onChangeInspections) return;
    const current = inspections[pieceId] || {};
    onChangeInspections({
      ...inspections,
      [pieceId]: {
        ...current,
        expanded: current.expanded === false ? true : false,
      },
    });
  };

  // Add photos to a garment piece via FileReader (persistent base64)
  const handleAddPhotos = (pieceId, filesList) => {
    const files = Array.from(filesList || []);
    if (!files.length) return;

    const current = inspections[pieceId] || {};
    const existingPhotos = current.photos || [];
    const remainingSlots = 6 - existingPhotos.length;
    if (remainingSlots <= 0) {
      showToast?.('Maximum 6 photos allowed per garment.');
      return;
    }

    const filesToRead = files.slice(0, remainingSlots);
    let loadedCount = 0;
    const newPhotos = [];

    filesToRead.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPhotos.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          size: `${Math.round(file.size / 1024)} KB`,
          timestamp: new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
          url: e.target.result,
        });

        loadedCount++;
        if (loadedCount === filesToRead.length) {
          const updatedList = [...existingPhotos, ...newPhotos];
          onChangeInspections({
            ...inspections,
            [pieceId]: {
              ...current,
              photos: updatedList,
            },
          });
          showToast?.(`✓ ${newPhotos.length} photo(s) added to ${current.name} (Piece ${current.piece}).`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove photo from a garment piece
  const handleRemovePhoto = (pieceId, photoIndex) => {
    const current = inspections[pieceId] || {};
    const existingPhotos = current.photos || [];
    const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);

    onChangeInspections({
      ...inspections,
      [pieceId]: {
        ...current,
        photos: updatedPhotos,
      },
    });
  };

  // Compute pieces list matching cart order
  const pieces = cart.flatMap((item) => {
    const qty = Math.max(1, parseInt(item.qty || 1, 10));
    return Array.from({ length: qty }, (_, i) => ({
      item,
      piece: i + 1,
      id: `${item.id}-piece-${i + 1}`,
    }));
  });

  return (
    <section className="inspection-wrap">
      {/* Header matching prototype */}
      <div className="inspection-header">
        <div className="inspection-header-left">
          <h2>
            <span>🔎</span>
            <span>Garment-by-Garment Inspection &amp; Care</span>
          </h2>
          <p>Each physical garment gets its own inspection record, notes and photo evidence.</p>
        </div>
        <div className="inspection-summary">
          <span className="inspection-badge blue">
            {pieces.length} inspection record{pieces.length === 1 ? '' : 's'}
          </span>
          <span className="inspection-badge green">● Auto-created from cart</span>
        </div>
      </div>

      {/* Garment Cards List */}
      <div className="inspection-list">
        {pieces.length === 0 ? (
          <div className="empty-inspection">
            <span className="empty-inspection-icon">🧺</span>
            <strong>No garments selected</strong>
            <span>Add garments to the cart to create their inspection forms.</span>
          </div>
        ) : (
          pieces.map(({ item, piece, id }) => {
            const data = inspections[id] || {
              name: item.name,
              color: '',
              stains: '',
              make: '',
              brand: '',
              fabric: '',
              notes: '',
              photos: [],
              expanded: true,
            };

            const isExpanded = data.expanded !== false;
            const photosCount = data.photos?.length || 0;

            return (
              <article key={id} className="garment-card">
                {/* Top Bar with Thumbnail, Identifier and Actions */}
                <div className="garment-top">
                  <div className="garment-title">
                    <div className="garment-thumb">
                      {item.icon ? (
                        <span>{item.icon}</span>
                      ) : (
                        <ClothIllustration clothId={item.productId || item.id} className="garment-thumb-img" />
                      )}
                    </div>
                    <div className="garment-title-info">
                      <strong>
                        {item.name} — Piece {piece}
                      </strong>
                      <small>
                        <span>Item ID:</span>
                        <span className="code-pill">{id}</span>
                        <span>· Service: {item.serviceType || item.service || 'Laundry'}</span>
                      </small>
                    </div>
                  </div>

                  <div className="garment-actions">
                    <span className={`inspection-badge ${photosCount > 0 ? 'green' : 'blue'}`}>
                      📸 {photosCount} photo{photosCount === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      className="collapse-btn"
                      onClick={() => toggleCardCollapse(id)}
                      title={isExpanded ? 'Collapse inspection form' : 'Expand inspection form'}
                    >
                      <span>{isExpanded ? 'Collapse −' : 'Expand +'}</span>
                    </button>
                  </div>
                </div>

                {/* Card Body with 4-col Grid & Photos */}
                {isExpanded && (
                  <div className="garment-body">
                    <div className="garment-fields">
                      {/* 1. Garment Name */}
                      <div className="field">
                        <label>
                          Garment <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          value={data.name || ''}
                          onChange={(e) => handleFieldChange(id, 'name', e.target.value)}
                          placeholder="Garment name"
                        />
                      </div>

                      {/* 2. Color */}
                      <div className="field">
                        <label>Color</label>
                        <input
                          type="text"
                          value={data.color || ''}
                          onChange={(e) => handleFieldChange(id, 'color', e.target.value)}
                          placeholder="e.g. Navy blue"
                        />
                      </div>

                      {/* 3. Stains / Marks */}
                      <div className="field">
                        <label>Stains / Marks</label>
                        <input
                          type="text"
                          value={data.stains || ''}
                          onChange={(e) => handleFieldChange(id, 'stains', e.target.value)}
                          placeholder="e.g. Oil stain on sleeve"
                        />
                      </div>

                      {/* 4. Make / Manufacturer */}
                      <div className="field">
                        <label>Make</label>
                        <select
                          value={data.make || 'Manufacturer / make'}
                          onChange={(e) => handleFieldChange(id, 'make', e.target.value)}
                        >
                          {MAKE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 5. Brand */}
                      <div className="field">
                        <label>Brand</label>
                        <input
                          type="text"
                          value={data.brand || ''}
                          onChange={(e) => handleFieldChange(id, 'brand', e.target.value)}
                          placeholder="e.g. Van Heusen / Raymond"
                        />
                      </div>

                      {/* 6. Fabric Type */}
                      <div className="field">
                        <label>Fabric Type</label>
                        <select
                          value={data.fabric || 'Select fabric'}
                          onChange={(e) => handleFieldChange(id, 'fabric', e.target.value)}
                        >
                          {FABRIC_OPTIONS.map((fab) => (
                            <option key={fab} value={fab}>
                              {fab}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 7. Garment Notes (Span 2) */}
                      <div className="field span2">
                        <label>Garment Notes</label>
                        <input
                          type="text"
                          value={data.notes || ''}
                          onChange={(e) => handleFieldChange(id, 'notes', e.target.value)}
                          placeholder="Damage, special handling, customer instructions..."
                        />
                      </div>
                    </div>

                    {/* Dedicated Photos Section per Garment Piece */}
                    <div className="photo-section">
                      <div className="photo-head">
                        <div className="photo-head-title">
                          <span>📸</span>
                          <span>Garment Photos &amp; Visual Evidence</span>
                          <span className="photo-head-count">{photosCount} / 6 Attached</span>
                        </div>

                        <button
                          type="button"
                          className="photo-btn-add"
                          onClick={() => fileInputRefs.current[id]?.click()}
                        >
                          <span>＋</span>
                          <span>Add Photo</span>
                        </button>

                        <input
                          ref={(el) => {
                            fileInputRefs.current[id] = el;
                          }}
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            handleAddPhotos(id, e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </div>

                      <div className="photo-help">
                        Upload stains, damage, brand tags or pre-wash condition. Maximum 6 photos per garment.
                      </div>

                      <div className="photo-grid">
                        {(data.photos || []).map((photo, pIdx) => {
                          const src = typeof photo === 'string' ? photo : photo.url;
                          const name = typeof photo === 'string' ? `Photo ${pIdx + 1}` : photo.name || `Photo ${pIdx + 1}`;

                          return (
                            <div key={photo.id || pIdx} className="photo-tile">
                              <img
                                src={src}
                                alt={name}
                                onClick={() => setLightboxPhoto({ src, name })}
                                title="Click to view full photo"
                              />
                              <button
                                type="button"
                                className="photo-remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePhoto(id, pIdx);
                                }}
                                title="Remove photo"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}

                        {photosCount < 6 && (
                          <div
                            className="photo-tile upload"
                            onClick={() => fileInputRefs.current[id]?.click()}
                            title="Click to attach photos"
                          >
                            <span className="emoji">＋</span>
                            <span>Add photo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Lightbox Modal for Photo Zoom */}
      {lightboxPhoto && (
        <div className="garment-lightbox-overlay" onClick={() => setLightboxPhoto(null)}>
          <div className="garment-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <div className="garment-lightbox-head">
              <strong style={{ fontSize: '13px', color: 'var(--text-primary, #f1f5f9)' }}>
                {lightboxPhoto.name}
              </strong>
              <button
                type="button"
                className="collapse-btn"
                onClick={() => setLightboxPhoto(null)}
              >
                ✕ Close
              </button>
            </div>
            <div className="garment-lightbox-body">
              <img src={lightboxPhoto.src} alt={lightboxPhoto.name} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
