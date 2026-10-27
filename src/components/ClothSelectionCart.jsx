// src/components/ClothSelectionCart.jsx
// Embedded Cloth Selection & Cart Component matching media_1793092679712_894007e0.png & media_1793092697433_e3fa94c3.png

import React, { useState, useEffect, useMemo } from 'react';
import ClothIllustration from './ClothIllustration';
import { getProducts } from '../services/customerService';
import '../styles/ClothSelectionCart.css';

const CATALOG_ITEMS = [
  { id: 'shirt', name: 'Shirt', category: 'Men', price: 15, unit: 'piece' },
  { id: 'tshirt', name: 'T-Shirt', category: 'Men', price: 12, unit: 'piece' },
  { id: 'formal_pant', name: 'Formal Pant', category: 'Men', price: 20, unit: 'piece' },
  { id: 'jeans', name: 'Jeans', category: 'Men', price: 25, unit: 'piece' },
  { id: 'saree', name: 'Saree', category: 'Women', price: 60, unit: 'piece' },
  { id: 'towel', name: 'Towel', category: 'Home Linen', price: 15, unit: 'piece' },
  { id: 'chudidar', name: 'Chudidar / Salwar', category: 'Women', price: 35, unit: 'piece' },
  { id: 'kurti', name: 'Kurti', category: 'Women', price: 30, unit: 'piece' },
  { id: 'shorts', name: 'Shorts', category: 'Kids', secondaryCategory: 'Men', price: 15, unit: 'piece' },
  { id: 'bedsheet', name: 'Bedsheet', category: 'Home Linen', price: 50, unit: 'piece' },
  { id: 'pillow_cover', name: 'Pillow Cover', category: 'Home Linen', price: 10, unit: 'piece' },
  { id: 'jacket', name: 'Jacket', category: 'Men', secondaryCategory: 'Women', price: 50, unit: 'piece' },
  { id: 'blazer_suit', name: 'Blazer / Suit', category: 'Men', price: 100, unit: 'piece' },
  { id: 'sweater', name: 'Sweater', category: 'Men', secondaryCategory: 'Women', price: 40, unit: 'piece' },
  { id: 'cap', name: 'Cap', category: 'Accessories', secondaryCategory: 'Kids', price: 10, unit: 'piece' },
  { id: 'curtain', name: 'Curtain', category: 'Home Linen', price: 60, unit: 'piece' },
];

const CATEGORIES = ['All', 'Men', 'Women', 'Home Linen', 'Accessories'];
const SERVICE_OPTIONS = ['Ironing', 'Washing', 'Wash & Iron', 'Dry Clean', 'Steam Press'];

export default function ClothSelectionCart({
  initialCart = [],
  initialCareNotes = '',
  isTaxExempt = false,
  currencySymbol = '₹',
  onChange,
}) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogItems, setCatalogItems] = useState(CATALOG_ITEMS);

  // Selected item in the detail card
  const [selectedProduct, setSelectedProduct] = useState(CATALOG_ITEMS[0]);
  const [selectedService, setSelectedService] = useState('Ironing');
  const [selectedQty, setSelectedQty] = useState(1);

  // Load products from Supabase washdoor_products table
  useEffect(() => {
    let isMounted = true;
    getProducts().then((res) => {
      if (isMounted && res?.data && res.data.length > 0) {
        setCatalogItems(res.data);
        setSelectedProduct((prev) => {
          if (!prev || prev.id === CATALOG_ITEMS[0].id) {
            return res.data[0];
          }
          return res.data.find((p) => p.id === prev.id || p.name === prev.name) || res.data[0];
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Cart state
  const [cart, setCart] = useState(() => {
    if (Array.isArray(initialCart) && initialCart.length > 0) return initialCart;
    return [];
  });

  // Care instructions
  const [careNotes, setCareNotes] = useState(initialCareNotes || '');

  // Filtered products list
  const filteredCatalog = useMemo(() => {
    return catalogItems.filter((item) => {
      const matchCat =
        activeCategory === 'All' ||
        item.category === activeCategory ||
        item.secondaryCategory === activeCategory;
      const matchSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchCat && matchSearch;
    });
  }, [catalogItems, activeCategory, searchQuery]);

  // Price calculations
  const totalItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [cart]);

  const gstAmount = isTaxExempt ? 0 : subtotal * 0.05;
  const grandTotal = subtotal + gstAmount;

  // Emit changes to parent
  useEffect(() => {
    onChange?.({
      cart,
      subtotal,
      gstAmount,
      grandTotal,
      totalItemCount,
      careNotes,
    });
  }, [cart, subtotal, gstAmount, grandTotal, totalItemCount, careNotes, onChange]);

  // Click card or '+ Add' to select product
  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    setSelectedQty(1);
  };

  // Add to cart from Selected Item Details
  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const rate = selectedProduct.price;
    const qty = Math.max(1, selectedQty);
    const lineAmount = rate * qty;

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (c) => c.id === selectedProduct.id && c.serviceType === selectedService
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        const nextQty = copy[existingIdx].qty + qty;
        copy[existingIdx] = {
          ...copy[existingIdx],
          qty: nextQty,
          amount: copy[existingIdx].rate * nextQty,
        };
        return copy;
      }
      return [
        ...prev,
        {
          id: selectedProduct.id,
          name: selectedProduct.name,
          category: selectedProduct.category,
          serviceType: selectedService,
          rate: rate,
          qty: qty,
          amount: lineAmount,
        },
      ];
    });
  };

  // Quick add button on item card
  const handleQuickAdd = (e, prod) => {
    e.stopPropagation();
    setSelectedProduct(prod);
    const rate = prod.price;
    const qty = 1;

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (c) => c.id === prod.id && c.serviceType === selectedService
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        const nextQty = copy[existingIdx].qty + 1;
        copy[existingIdx] = {
          ...copy[existingIdx],
          qty: nextQty,
          amount: copy[existingIdx].rate * nextQty,
        };
        return copy;
      }
      return [
        ...prev,
        {
          id: prod.id,
          name: prod.name,
          category: prod.category,
          serviceType: selectedService,
          rate: rate,
          qty: qty,
          amount: rate * qty,
        },
      ];
    });
  };

  // Steppers in Cart
  const handleCartQtyChange = (idx, delta) => {
    setCart((prev) => {
      const copy = [...prev];
      const nextQty = copy[idx].qty + delta;
      if (nextQty <= 0) {
        return copy.filter((_, i) => i !== idx);
      }
      copy[idx] = {
        ...copy[idx],
        qty: nextQty,
        amount: copy[idx].rate * nextQty,
      };
      return copy;
    });
  };

  const handleRemoveCartItem = (idx) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  return (
    <div className="cloth-selection-container">
      {/* ── Main Grid ── */}
      <div className="cloth-main-grid">
        {/* Left Column: Catalog */}
        <div className="cloth-catalog-card">
          <div className="cloth-card-head">
            <div className="cloth-head-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
              </svg>
            </div>
            <div className="cloth-head-text">
              <div className="cloth-head-title">Cloth Selection &amp; Cart</div>
              <div className="cloth-head-sub">Select clothes, choose service, set quantity and add to cart</div>
            </div>
          </div>

          {/* Search bar */}
          <div className="cloth-search-wrap">
            <svg className="cloth-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="cloth-search-input"
              placeholder="Search clothes (e.g. shirt, jeans, saree....)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category filter pills */}
          <div className="cloth-cat-pills">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`cloth-cat-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Catalog grid */}
          <div className="cloth-grid-scroll">
            <div className="cloth-items-grid">
              {filteredCatalog.map((prod) => {
                const isSelected = selectedProduct?.id === prod.id;
                return (
                  <div
                    key={prod.id}
                    className={`cloth-grid-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectProduct(prod)}
                  >
                    <div className="cloth-img-box">
                      <ClothIllustration itemId={prod.id} size={38} />
                    </div>
                    <div className="cloth-item-name" title={prod.name}>
                      {prod.name}
                    </div>
                    <div className="cloth-price-tag">
                      {currencySymbol} {prod.price}
                    </div>
                    <div className="cloth-price-unit">/ {prod.unit}</div>
                    <button
                      type="button"
                      className="cloth-add-btn"
                      onClick={(e) => handleQuickAdd(e, prod)}
                    >
                      <span>+</span>
                      <span>Add</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Item Details & Cart */}
        <div className="cloth-side-col">
          {/* Card 1: Selected Item Details */}
          {selectedProduct && (
            <div className="cloth-detail-card">
              <div className="cloth-detail-head">
                <div className="cloth-detail-title-wrap">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2">
                    <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
                  </svg>
                  <span className="cloth-detail-title">Selected Item Details</span>
                </div>
              </div>

              {/* Item row preview */}
              <div className="cloth-preview-row">
                <div className="cloth-preview-thumb">
                  <ClothIllustration itemId={selectedProduct.id} size={40} />
                </div>
                <div className="cloth-preview-info">
                  <div className="cloth-preview-name-row">
                    <span className="cloth-preview-name">{selectedProduct.name}</span>
                    <span className="cloth-preview-cat">{selectedProduct.category}</span>
                  </div>
                  <div className="cloth-preview-rate">
                    {currencySymbol} {selectedProduct.price} / {selectedProduct.unit}
                  </div>
                </div>
              </div>

              {/* Service & Qty Controls */}
              <div className="cloth-controls-row">
                <div className="cloth-ctrl-group cloth-service-group">
                  <label className="cloth-ctrl-label" htmlFor="clothServiceSelect">Service Type</label>
                  <select
                    id="clothServiceSelect"
                    className="cloth-ctrl-select"
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                  >
                    {SERVICE_OPTIONS.map((srv) => (
                      <option key={srv} value={srv}>
                        {srv}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cloth-ctrl-group cloth-qty-group">
                  <label className="cloth-ctrl-label">Quantity</label>
                  <div className="cloth-stepper">
                    <button
                      type="button"
                      className="cloth-step-btn"
                      onClick={() => setSelectedQty((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="cloth-step-val">{selectedQty}</span>
                    <button
                      type="button"
                      className="cloth-step-btn"
                      onClick={() => setSelectedQty((q) => q + 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="cloth-btn-add-cart"
                  onClick={handleAddToCart}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          )}

          {/* Card 2: Cart Items */}
          <div className="cloth-cart-card">
            <div className="cloth-detail-head">
              <div className="cloth-detail-title-wrap">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2">
                  <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
                </svg>
                <span className="cloth-detail-title">Cart Items ({cart.length})</span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  className="cloth-clear-btn"
                  onClick={handleClearCart}
                  title="Remove all items from cart"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>Clear Cart</span>
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '18px 10px', color: '#64748b', fontSize: '12px' }}>
                No clothes in cart yet. Select item above and tap "Add to Cart".
              </div>
            ) : (
              <div className="cloth-cart-list">
                {cart.map((item, idx) => (
                  <div key={`${item.id}-${item.serviceType}-${idx}`} className="cloth-cart-row">
                    <div className="cloth-cart-left">
                      <div className="cloth-cart-thumb">
                        <ClothIllustration itemId={item.id} size={26} />
                      </div>
                      <div className="cloth-cart-info">
                        <span className="cloth-cart-name">{item.name}</span>
                        <span className="cloth-cart-srv">{item.serviceType}</span>
                      </div>
                    </div>

                    <div className="cloth-cart-rate">
                      {currencySymbol} {item.rate}
                    </div>

                    <div className="cloth-stepper cloth-cart-stepper">
                      <button
                        type="button"
                        className="cloth-step-btn"
                        onClick={() => handleCartQtyChange(idx, -1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="cloth-step-val">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        className="cloth-step-btn"
                        onClick={() => handleCartQtyChange(idx, 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <div className="cloth-cart-amount">
                      {currencySymbol} {item.amount}
                    </div>

                    <button
                      type="button"
                      className="cloth-cart-del"
                      onClick={() => handleRemoveCartItem(idx)}
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pricing Summary */}
            <div className="cloth-pricing-box">
              <div className="cloth-price-line">
                <span>Subtotal</span>
                <strong>{currencySymbol} {subtotal.toFixed(2)}</strong>
              </div>
              <div className="cloth-price-line">
                <span>
                  GST / Tax (5%) {isTaxExempt && <span style={{ color: '#fbbf24', fontSize: '10.5px' }}>(Tax Exempt)</span>}
                </span>
                <strong>{currencySymbol} {gstAmount.toFixed(2)}</strong>
              </div>
              <div className="cloth-grand-total-bar">
                <span>Grand Total</span>
                <span className="cloth-grand-total-val">{currencySymbol} {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Card: Special Fabric Care Instructions ── */}
      <div className="cloth-care-card">
        <div className="cloth-care-head">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>Special Fabric Care Instructions (optional)</span>
        </div>
        <div className="cloth-care-textarea-wrap">
          <textarea
            className="cloth-care-textarea"
            maxLength={200}
            placeholder="e.g., Handle with care, Remove ink stains, Use gentle wash, etc."
            value={careNotes}
            onChange={(e) => setCareNotes(e.target.value)}
          />
          <span className="cloth-care-counter">{careNotes.length}/200</span>
        </div>
      </div>
    </div>
  );
}
