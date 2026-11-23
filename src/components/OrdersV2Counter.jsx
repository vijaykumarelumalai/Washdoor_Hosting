// src/components/OrdersV2Counter.jsx - High-Fidelity POS Counter Intake for Orders v2
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, TextField, Select, MenuItem,
  Divider, Button, IconButton, Chip, Card, Stack, InputAdornment,
} from '@mui/material';
import {
  Add, Delete, Close, ShoppingCart, PersonSearch,
  CheckCircle, AccessTime, LocalShipping, OpenInNew,
} from '@mui/icons-material';
import ClothIllustration from './ClothIllustration';
import ServiceTypeSelect from './ServiceTypeSelect';
import {
  createOrderWithCustomer,
  searchCustomers,
  fetchActiveStaffMaster,
  fetchActivePickupDeliveryMaster,
  DEFAULT_PRODUCTS,
} from '../services/customerService';
import {
  isOnCallOrderType,
  validateOnCallSchedule,
} from '../utils/onCallScheduling';

const CATEGORIES = ['All', 'Men', 'Women', 'Home Linen', 'Accessories'];

export function OrdersV2Counter({
  isOpen,
  onClose,
  onSave,
  onOpenCreateModal,
  currencySymbol = '₹',
  t,
}) {
  // Customer & Order Information
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [orderType, setOrderType] = useState('Walk-in');
  const [serviceCategory, setServiceCategory] = useState('Laundry');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [scheduledPickupDate, setScheduledPickupDate] = useState('');
  const [scheduledPickupTime, setScheduledPickupTime] = useState('');
  const [scheduledDeliveryDate, setScheduledDeliveryDate] = useState('');
  const [scheduledDeliveryTime, setScheduledDeliveryTime] = useState('');
  const [comments, setComments] = useState('');

  // Cart & Catalog
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [advancePaid, setAdvancePaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Staff & Drivers
  const [staffList, setStaffList] = useState([]);
  const [driverList, setDriverList] = useState([]);
  const [assignedStaff, setAssignedStaff] = useState('Counter Staff');
  const [assignedDriver, setAssignedDriver] = useState('');

  // Customer Search Suggestions
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Status & Validation
  const [scheduleErrors, setScheduleErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Staff and Driver Masters
  useEffect(() => {
    let active = true;
    fetchActiveStaffMaster().then((res) => {
      if (active && res?.data && res.data.length > 0) {
        setStaffList(res.data);
      }
    });
    fetchActivePickupDeliveryMaster().then((res) => {
      if (active && res?.data && res.data.length > 0) {
        setDriverList(res.data);
      }
    });
    return () => { active = false; };
  }, []);

  // Customer search debounce
  useEffect(() => {
    if (!customerSearchQuery || customerSearchQuery.trim().length < 2) {
      setCustomerSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingCustomers(true);
      const res = await searchCustomers(customerSearchQuery.trim());
      setSearchingCustomers(false);
      if (res?.data) {
        setCustomerSuggestions(res.data);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  const selectCustomer = (cust) => {
    setCustomerName(cust.customer_name || cust.name || '');
    setMobileNumber(cust.mobile_number || cust.phone || '');
    setAddress(cust.address || '');
    setCustomerSearchQuery('');
    setCustomerSuggestions([]);
  };

  // Filter Catalog Items
  const filteredCatalog = useMemo(() => {
    if (activeCategory === 'All') return DEFAULT_PRODUCTS;
    return DEFAULT_PRODUCTS.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + (Number(it.qty || 1) * Number(it.rate || it.price || 0)), 0);
  }, [cart]);

  const taxAmount = useMemo(() => Math.round((subtotal * 0.05 + Number.EPSILON) * 100) / 100, [subtotal]);
  const grandTotal = useMemo(() => Math.round((subtotal + taxAmount + Number.EPSILON) * 100) / 100, [subtotal, taxAmount]);
  const advanceNum = Number(advancePaid) || 0;
  const balanceDue = Math.max(0, grandTotal - advanceNum);
  const paymentStatus = advanceNum >= grandTotal && grandTotal > 0 ? 'Paid' : (advanceNum > 0 ? 'Partially Paid' : 'Unpaid');

  // Add Item to Cart
  const addItemToCart = (prod) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.id === prod.id && i.serviceType === serviceCategory);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: Number(next[idx].qty) + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: prod.id,
          name: prod.name,
          category: prod.category,
          qty: 1,
          rate: prod.price || 20,
          serviceType: serviceCategory,
        },
      ];
    });
  };

  const updateItemQty = (index, delta) => {
    setCart((prev) => {
      const next = [...prev];
      const newQty = (Number(next[index].qty) || 1) + delta;
      if (newQty <= 0) {
        return next.filter((_, i) => i !== index);
      }
      next[index] = { ...next[index], qty: newQty };
      return next;
    });
  };

  const updateItemRate = (index, newRate) => {
    setCart((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], rate: Number(newRate) || 0 };
      return next;
    });
  };

  const updateItemService = (index, newService) => {
    setCart((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], serviceType: newService };
      return next;
    });
  };

  const removeItem = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSaveOrder = async () => {
    if (!customerName.trim() && !mobileNumber.trim()) {
      alert('Please enter at least a customer name or mobile number.');
      return;
    }

    let resolvedPickup = null;
    let resolvedDelivery = null;

    if (isOnCallOrderType(orderType)) {
      const sched = validateOnCallSchedule({
        pickupDate: scheduledPickupDate,
        pickupTime: scheduledPickupTime,
        deliveryDate: scheduledDeliveryDate,
        deliveryTime: scheduledDeliveryTime,
        isNewOrder: true,
      });
      if (!sched.isValid) {
        setScheduleErrors(sched.errors);
        alert(Object.values(sched.errors)[0]);
        return;
      }
      setScheduleErrors({});
      resolvedPickup = sched.scheduled_pickup_at;
      resolvedDelivery = sched.scheduled_delivery_at;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim() || 'Walk-in Customer',
        mobileNumber: mobileNumber.trim(),
        address: address.trim() || 'Counter Walk-In',
        serviceCategory: serviceCategory || 'Laundry',
        orderType: orderType || 'Walk-in',
        orderNotes: comments.trim(),
        subtotal: subtotal,
        taxAmount: taxAmount,
        totalAmount: grandTotal,
        advancePaid: advanceNum,
        balanceDue: balanceDue,
        paymentStatus: paymentStatus,
        paymentMethod: paymentMethod,
        items: cart,
        expectedDelivery: expectedDelivery || null,
        scheduledPickupAt: resolvedPickup,
        scheduledDeliveryAt: resolvedDelivery,
        assignedStaff: assignedStaff,
        assignedDriver: assignedDriver,
      };

      const result = await createOrderWithCustomer(payload);
      setIsSubmitting(false);
      if (result && !result.error) {
        onSave?.(result.data || payload);
        onClose();
      } else {
        alert(result?.error?.message || 'Failed to create order');
      }
    } catch (err) {
      setIsSubmitting(false);
      alert(err.message || 'Error occurred while saving order');
    }
  };

  if (!isOpen) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 3 },
        mb: 3,
        borderRadius: 3,
        border: '1.5px solid #007A3D',
        background: '#ffffff',
        boxShadow: '0 4px 20px rgba(37, 99, 235, 0.08)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb: 1.5, borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCart sx={{ color: '#007A3D', fontSize: 24 }} />
          <Typography variant="h6" fontWeight={700} color="#1e3a8a">
            {t?.('pos_create_order', 'Orders v2 - Quick POS Counter Intake') || 'Orders v2 - Quick POS Counter Intake'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onOpenCreateModal && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<OpenInNew fontSize="small" />}
              onClick={onOpenCreateModal}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Open Full Modal
            </Button>
          )}
          <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column: Customer & Order Details */}
        <Grid item xs={12} lg={6}>
          {/* Customer Lookup */}
          <Box sx={{ mb: 2, position: 'relative' }}>
            <TextField
              fullWidth
              size="small"
              label="Search Existing Customer (Name / Mobile)"
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonSearch fontSize="small" sx={{ color: '#64748b' }} />
                  </InputAdornment>
                ),
              }}
            />
            {customerSuggestions.length > 0 && (
              <Paper
                elevation={4}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  maxHeight: 180,
                  overflowY: 'auto',
                  border: '1px solid #cbd5e1',
                  borderRadius: 2,
                  mt: 0.5,
                }}
              >
                {customerSuggestions.map((c) => (
                  <Box
                    key={c.id || c.customer_id}
                    onClick={() => selectCustomer(c)}
                    sx={{
                      p: 1.2,
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      '&:hover': { bgcolor: '#eff6ff' },
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} color="#1e293b">{c.customer_name || c.name}</Typography>
                    <Typography variant="caption" color="#64748b">{c.mobile_number || c.phone} • {c.address || 'No address'}</Typography>
                  </Box>
                ))}
              </Paper>
            )}
          </Box>

          {/* Customer Direct Inputs */}
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Customer Full Name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Mobile Number *"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Customer Address / Landmark"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Order Type / Intake Method"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
              >
                <MenuItem value="Walk-in">Walk-in</MenuItem>
                <MenuItem value="Counter Drop">Counter Drop</MenuItem>
                <MenuItem value="On-Call (Pickup)">On-Call (Pickup)</MenuItem>
                <MenuItem value="Pickup & Delivery">Pickup & Delivery</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Primary Service Category"
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
              >
                <MenuItem value="Laundry">Wash & Steam Press</MenuItem>
                <MenuItem value="Dry Cleaning">Dry Cleaning</MenuItem>
                <MenuItem value="Wash & Fold">Wash & Fold</MenuItem>
                <MenuItem value="Steam Press Only">Steam Press Only</MenuItem>
              </TextField>
            </Grid>

            {/* On-Call Scheduling Fields if applicable */}
            {isOnCallOrderType(orderType) && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="Scheduled Pickup Date"
                    InputLabelProps={{ shrink: true }}
                    value={scheduledPickupDate}
                    onChange={(e) => setScheduledPickupDate(e.target.value)}
                    error={Boolean(scheduleErrors.scheduled_pickup_at)}
                    helperText={scheduleErrors.scheduled_pickup_at}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="time"
                    size="small"
                    label="Scheduled Pickup Time"
                    InputLabelProps={{ shrink: true }}
                    value={scheduledPickupTime}
                    onChange={(e) => setScheduledPickupTime(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="Scheduled Delivery Date"
                    InputLabelProps={{ shrink: true }}
                    value={scheduledDeliveryDate}
                    onChange={(e) => setScheduledDeliveryDate(e.target.value)}
                    error={Boolean(scheduleErrors.scheduled_delivery_at)}
                    helperText={scheduleErrors.scheduled_delivery_at}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="time"
                    size="small"
                    label="Scheduled Delivery Time"
                    InputLabelProps={{ shrink: true }}
                    value={scheduledDeliveryTime}
                    onChange={(e) => setScheduledDeliveryTime(e.target.value)}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                size="small"
                label="Expected Delivery Date"
                InputLabelProps={{ shrink: true }}
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Attending Staff"
                value={assignedStaff}
                onChange={(e) => setAssignedStaff(e.target.value)}
              >
                <MenuItem value="Counter Staff">Counter Staff</MenuItem>
                {staffList.map((s) => (
                  <MenuItem key={s.id || s.name} value={s.name}>{s.name} ({s.role || 'Staff'})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Special Instructions / Garment Notes"
                placeholder="e.g. Extra starch on shirts, collar stain removal..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Right Column: Catalog Grid & Cart */}
        <Grid item xs={12} lg={6}>
          {/* Garment Catalog Grid */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#334155">
                Garment Catalog (Click to add to Cart)
              </Typography>
            </Box>
            {/* Category Pills */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  size="small"
                  onClick={() => setActiveCategory(cat)}
                  color={activeCategory === cat ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                />
              ))}
            </Box>

            {/* Catalog Items */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
                gap: 1,
                maxHeight: 180,
                overflowY: 'auto',
                p: 1,
                bgcolor: '#f8fafc',
                borderRadius: 2,
                border: '1px solid #e2e8f0',
              }}
            >
              {filteredCatalog.map((prod) => (
                <Box
                  key={prod.id}
                  onClick={() => addItemToCart(prod)}
                  sx={{
                    bgcolor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    p: 1,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: '#007A3D',
                      boxShadow: '0 2px 8px rgba(37,99,235,0.12)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  <ClothIllustration clothId={prod.id} size={30} />
                  <Typography variant="caption" display="block" fontWeight={600} noWrap sx={{ mt: 0.5, color: '#1e293b' }}>
                    {prod.name}
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color="#007A3D">
                    {currencySymbol}{prod.price}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Cart Table */}
          <Box sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#1e293b">
                Order Items Cart ({cart.reduce((a, b) => a + (Number(b.qty) || 0), 0)} items)
              </Typography>
              {cart.length > 0 && (
                <Button size="small" color="error" onClick={() => setCart([])} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                  Clear Cart
                </Button>
              )}
            </Box>

            {cart.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center', color: '#94a3b8' }}>
                <Typography variant="body2">No garments added yet. Click items above to add.</Typography>
              </Box>
            ) : (
              <Box sx={{ maxHeight: 180, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '4px 6px' }}>Garment</th>
                      <th style={{ padding: '4px 6px' }}>Qty</th>
                      <th style={{ padding: '4px 6px' }}>Rate</th>
                      <th style={{ padding: '4px 6px' }}>Total</th>
                      <th style={{ padding: '4px 6px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px' }}>
                          <Typography variant="body2" fontWeight={600} fontSize="0.82rem">{item.name}</Typography>
                          <Typography variant="caption" color="#64748b">{item.serviceType || serviceCategory}</Typography>
                        </td>
                        <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <button
                              type="button"
                              onClick={() => updateItemQty(idx, -1)}
                              style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff' }}
                            >
                              -
                            </button>
                            <span style={{ fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => updateItemQty(idx, 1)}
                              style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff' }}
                            >
                              +
                            </button>
                          </Box>
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateItemRate(idx, e.target.value)}
                            style={{ width: 50, padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: '0.8rem' }}
                          />
                        </td>
                        <td style={{ padding: '6px', fontWeight: 600, color: '#1e293b' }}>
                          {currencySymbol}{(Number(item.qty || 1) * Number(item.rate || 0)).toFixed(2)}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'right' }}>
                          <IconButton size="small" onClick={() => removeItem(idx)} sx={{ color: '#ef4444', p: 0.5 }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}

            {/* Financial Summary */}
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b' }}>
                <span>Subtotal:</span>
                <span>{currencySymbol}{subtotal.toFixed(2)}</span>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b' }}>
                <span>GST (5%):</span>
                <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                <span>Grand Total:</span>
                <span>{currencySymbol}{grandTotal.toFixed(2)}</span>
              </Box>
            </Box>
          </Box>

          {/* Payment & Advance */}
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Advance Paid"
                value={advancePaid}
                onChange={(e) => setAdvancePaid(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Payment Mode"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="UPI / QR Code">UPI / QR Code</MenuItem>
                <MenuItem value="Card">Card</MenuItem>
                <MenuItem value="Store Credit">Store Credit</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="#64748b" display="block">Balance Due</Typography>
                <Typography variant="body1" fontWeight={700} color={balanceDue > 0 ? '#b45309' : '#15803d'}>
                  {currencySymbol}{balanceDue.toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Footer Actions */}
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, alignItems: 'center' }}>
        <Button variant="outlined" onClick={onClose} size="medium" sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="medium"
          startIcon={<CheckCircle />}
          disabled={isSubmitting || (!customerName && !mobileNumber)}
          onClick={handleSaveOrder}
          sx={{ textTransform: 'none', fontWeight: 700, px: 3, bgcolor: '#007A3D', '&:hover': { bgcolor: '#006332' } }}
        >
          {isSubmitting ? 'Saving Order...' : 'Save & Confirm Order'}
        </Button>
      </Box>
    </Paper>
  );
}

export default OrdersV2Counter;
