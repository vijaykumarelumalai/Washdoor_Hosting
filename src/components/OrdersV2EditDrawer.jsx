// src/components/OrdersV2EditDrawer.jsx - Slide-over Drawer for Editing Orders in Orders v2
import React, { useState, useEffect, useMemo } from 'react';
import { normalizeOrdersV2Status } from './OrdersV2List';
import {
  Box, Drawer, Tabs, Tab, Typography, TextField, Select, MenuItem,
  Button, IconButton, Card, Divider, Grid, InputAdornment, Stack, Chip,
} from '@mui/material';
import { Close, Save, Delete, Add } from '@mui/icons-material';
import { updateOrderInSupabase, fetchActiveStaffMaster, fetchActivePickupDeliveryMaster } from '../services/customerService';
import { formatServiceBreakdown } from '../config/businessRules';
import { sanitizeAddress } from '../utils/normalizeOrder';
import { isOnCallOrderType, resolveOptionalDelivery, splitIsoToLocalDateAndTime, validateOnCallSchedule } from '../utils/onCallScheduling';

export function OrdersV2EditDrawer({
  open,
  order,
  onClose,
  onSave,
  onSavingChange,
  currencySymbol = '₹',
  t,
  language,
  formatDateFn,
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [localDraft, setLocalDraft] = useState(null);
  const [itemsList, setItemsList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [driverList, setDriverList] = useState([]);
  const [scheduleErrors, setScheduleErrors] = useState({});
  const [addressError, setAddressError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetchActiveStaffMaster().then((res) => {
      if (active && res?.data) setStaffList(res.data);
    });
    fetchActivePickupDeliveryMaster().then((res) => {
      if (active && res?.data) setDriverList(res.data);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (order) {
      const pickupSplit = splitIsoToLocalDateAndTime(order.scheduled_pickup_at);
      const deliverySplit = splitIsoToLocalDateAndTime(order.scheduled_delivery_at);
      const normalizedStatus = normalizeOrdersV2Status(order.order_status || order.status);
      setLocalDraft({
        ...order,
        order_status: normalizedStatus,
        status: normalizedStatus,
        scheduled_pickup_date: pickupSplit.date,
        scheduled_pickup_time: pickupSplit.time,
        scheduled_delivery_date: deliverySplit.date,
        scheduled_delivery_time: deliverySplit.time,
      });
      setItemsList(Array.isArray(order.items) ? [...order.items] : []);
      setScheduleErrors({});
      setAddressError('');
    } else {
      setLocalDraft(null);
      setItemsList([]);
    }
  }, [order, open]);

  const handleFieldChange = (key, val) => {
    setLocalDraft((prev) => ({ ...prev, [key]: val }));
    if (key === 'order_type' || (key === 'address' && String(val || '').trim())) {
      setAddressError('');
    }
    if ((key === 'scheduled_delivery_date' || key === 'scheduled_delivery_time') && scheduleErrors.scheduled_delivery_at) {
      setScheduleErrors((prev) => ({ ...prev, scheduled_delivery_at: '' }));
    }
  };

  // Subtotal & Calculations
  const subtotal = useMemo(() => {
    return itemsList.reduce((acc, it) => acc + (Number(it.qty || 1) * Number(it.rate || it.price || 0)), 0);
  }, [itemsList]);

  const taxAmount = useMemo(() => Math.round((subtotal * 0.05 + Number.EPSILON) * 100) / 100, [subtotal]);
  const grandTotal = useMemo(() => Math.round((subtotal + taxAmount + Number.EPSILON) * 100) / 100, [subtotal, taxAmount]);
  const advanceNum = Number(localDraft?.advance_paid) || 0;
  const balanceDue = Math.max(0, grandTotal - advanceNum);
  const derivedPaymentStatus = advanceNum >= grandTotal && grandTotal > 0 ? 'Paid' : (advanceNum > 0 ? 'Partially Paid' : 'Unpaid');

  const handleUpdateItem = (idx, field, value) => {
    setItemsList((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleAddItem = () => {
    setItemsList((prev) => [
      ...prev,
      { id: 'item_' + Date.now(), name: 'New Garment', qty: 1, rate: 20, serviceType: localDraft?.service_category || 'Laundry' },
    ]);
  };

  const handleRemoveItem = (idx) => {
    setItemsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!localDraft) return;

    if (isOnCallOrderType(localDraft.order_type) && !sanitizeAddress(localDraft.address)) {
      setAddressError('Address is required for On-Call orders.');
      alert('Address is required for On-Call orders.');
      return;
    }
    setAddressError('');

    let resolvedPickup = localDraft.scheduled_pickup_at || null;
    let resolvedDelivery = localDraft.scheduled_delivery_at || null;

    if (isOnCallOrderType(localDraft.order_type)) {
      const sched = validateOnCallSchedule({
        pickupDate: localDraft.scheduled_pickup_date,
        pickupTime: localDraft.scheduled_pickup_time,
        deliveryDate: localDraft.scheduled_delivery_date,
        deliveryTime: localDraft.scheduled_delivery_time,
        isNewOrder: false,
        initialPickupIso: localDraft.scheduled_pickup_at || null,
      });
      if (!sched.isValid) {
        setScheduleErrors(sched.errors);
        alert(Object.values(sched.errors)[0]);
        return;
      }
      setScheduleErrors({});
      resolvedPickup = sched.scheduled_pickup_at;
      resolvedDelivery = sched.scheduled_delivery_at;
    } else {
      const deliveryResult = resolveOptionalDelivery({
        deliveryDate: localDraft.scheduled_delivery_date,
        deliveryTime: localDraft.scheduled_delivery_time,
      });
      if (!deliveryResult.isValid) {
        setScheduleErrors(deliveryResult.errors);
        alert(Object.values(deliveryResult.errors)[0]);
        return;
      }
      setScheduleErrors({});
      resolvedDelivery = deliveryResult.scheduled_delivery_at;
    }

    setSaving(true);
    onSavingChange?.(true);
    try {
      const nowIso = new Date().toISOString();
      const staffActor = (localDraft.assigned_staff || order?.assigned_staff || 'Counter Staff').trim();
      const pickupPerson = (localDraft.assigned_driver || order?.assigned_driver || '').trim();

      const prevHistory = Array.isArray(order?.activity_history) && order.activity_history.length > 0
        ? [...order.activity_history]
        : (Array.isArray(order?.audit_logs) && order.audit_logs.length > 0
          ? [...order.audit_logs]
          : (Array.isArray(order?.logs) ? [...order.logs] : []));

      const addedEvents = [];
      const newStatus = normalizeOrdersV2Status(localDraft.order_status || localDraft.status);
      const oldStatus = normalizeOrdersV2Status(order?.order_status || order?.status);

      if (newStatus !== oldStatus) {
        addedEvents.push({
          id: `act_status_${Date.now()}`,
          type: newStatus === 'Delivered' ? 'collection' : 'status',
          title: newStatus === 'Delivered' ? 'Order Delivered' : 'Status Updated',
          detail: newStatus === 'Delivered'
            ? `Garments delivered (${pickupPerson || localDraft.customer_name || 'Customer'})`
            : `${newStatus}`,
          staff: staffActor,
          timestamp: nowIso,
        });
      }

      const prevCartSig = (order?.items || []).map((i) => `${i.name || i.item_name || ''}:${i.qty || i.quantity || 1}:${i.serviceType || i.service || ''}`).join('|');
      const nextCartSig = itemsList.map((i) => `${i.name || i.item_name || ''}:${i.qty || i.quantity || 1}:${i.serviceType || i.service || ''}`).join('|');
      if (prevCartSig !== nextCartSig || (order?.items || []).length !== itemsList.length) {
        const breakdownText = formatServiceBreakdown(itemsList, localDraft.service_category || order?.service_category || 'Laundry', true);
        const totalPcs = itemsList.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
        addedEvents.push({
          id: `act_svc_${Date.now() + 1}`,
          type: 'service',
          title: 'Service Updated',
          detail: breakdownText || `Garments updated (${totalPcs} pcs)`,
          staff: staffActor,
          timestamp: nowIso,
        });
      }

      const prevAdv = Number(order?.advance_paid || 0);
      const nextAdv = Number(advanceNum || 0);
      const effectivePaymentStatus = localDraft.payment_status || derivedPaymentStatus;
      if (nextAdv > 0 && (nextAdv !== prevAdv || effectivePaymentStatus !== order?.payment_status)) {
        addedEvents.push({
          id: `act_pay_${Date.now() + 2}`,
          type: 'payment',
          title: 'Payment Received',
          detail: `${currencySymbol}${nextAdv.toFixed(2)} received via ${localDraft.payment_method || 'Cash'}`,
          staff: staffActor,
          timestamp: nowIso,
        });
      }

      const initialHistory = [];
      const origItems = Array.isArray(order?.items) && order.items.length > 0 ? order.items : itemsList;
      if (origItems.length > 0) {
        const initialBreakdown = formatServiceBreakdown(origItems, order?.service_category || 'Laundry', true);
        initialHistory.push({
          id: 'act_svc_init',
          type: 'service',
          title: 'Service Allocated',
          detail: initialBreakdown || `${order?.service_category || 'Laundry'} (${origItems.length} items)`,
          staff: order?.attend_staff_name || order?.assigned_staff || 'Counter Staff',
          timestamp: order?.created_at || nowIso,
        });
      }
      initialHistory.push({
        id: 'act_recv_init',
        type: 'received',
        title: 'Order Received',
        detail: 'New order placed',
        staff: order?.attend_staff_name || order?.assigned_staff || 'Counter Staff',
        timestamp: order?.created_at || nowIso,
      });

      const baseHistory = prevHistory.length > 0 ? prevHistory : initialHistory;
      const combinedHistory = [...addedEvents, ...baseHistory];
      const cleanAddress = sanitizeAddress(localDraft.address);

      const payload = {
        customerName: localDraft.customer_name,
        mobileNumber: localDraft.mobile_number,
        address: cleanAddress,
        serviceCategory: localDraft.service_category,
        orderType: localDraft.order_type || 'Walk-in',
        status: newStatus,
        orderStatus: newStatus,
        expectedDelivery: localDraft.expected_delivery,
        scheduledPickupAt: resolvedPickup,
        scheduledDeliveryAt: resolvedDelivery,
        assignedStaff: localDraft.assigned_staff || 'Counter Staff',
        attend_staff_name: localDraft.assigned_staff || 'Counter Staff',
        assignedDriver: localDraft.assigned_driver || '',
        assigned_driver: localDraft.assigned_driver || '',
        assigned_pickup_delivery_person: localDraft.assigned_driver || '',
        items: itemsList,
        subtotal: subtotal,
        taxAmount: taxAmount,
        totalAmount: grandTotal,
        advancePaid: advanceNum,
        balanceDue: balanceDue,
        paymentStatus: effectivePaymentStatus,
        paymentMethod: localDraft.payment_method || 'Cash',
        orderNotes: localDraft.comments || localDraft.special_instructions || '',
        activity_history: combinedHistory,
        audit_logs: combinedHistory,
        logs: combinedHistory,
        status_updated_at: nowIso,
        status_updated_by: staffActor,
      };

      await updateOrderInSupabase(localDraft.order_number || localDraft.id, payload);
      onSave?.({ ...localDraft, ...payload, address: cleanAddress, activity_history: combinedHistory, audit_logs: combinedHistory, logs: combinedHistory });
      onClose();
    } catch (err) {
      alert(err.message || 'Error updating order');
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  };

  if (!open || !localDraft) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 460 },
          maxWidth: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#ffffff',
        },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" fontWeight={700} color="#0f172a">
            Edit Order: #{localDraft.order_number || localDraft.id}
          </Typography>
          <Typography variant="caption" color="#64748b">
            {localDraft.customer_name} • {localDraft.mobile_number}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_e, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: '1px solid #e2e8f0', px: 1 }}
      >
        <Tab label="1. Details" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }} />
        <Tab label="2. Items" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }} />
        <Tab label="3. Payments" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }} />
        <Tab label="4. Schedule" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }} />
        <Tab label="5. Notes" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }} />
      </Tabs>

      {/* Tab Panels */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
        {activeTab === 0 && (
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              label="Customer Full Name"
              value={localDraft.customer_name || ''}
              onChange={(e) => handleFieldChange('customer_name', e.target.value)}
            />
            <TextField
              fullWidth
              size="small"
              label="Mobile Number"
              value={localDraft.mobile_number || ''}
              onChange={(e) => handleFieldChange('mobile_number', e.target.value)}
            />
            <TextField
              fullWidth
              size="small"
              label={isOnCallOrderType(localDraft.order_type) ? 'Address *' : 'Address (optional)'}
              value={localDraft.address || ''}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              error={Boolean(addressError)}
              helperText={addressError}
            />
            <TextField
              select
              fullWidth
              size="small"
              label="Order Type"
              value={localDraft.order_type || 'Walk-in'}
              onChange={(e) => handleFieldChange('order_type', e.target.value)}
            >
              <MenuItem value="Walk-in">Walk-in</MenuItem>
              <MenuItem value="Counter Drop">Counter Drop</MenuItem>
              <MenuItem value="On-Call (Pickup)">On-Call (Pickup)</MenuItem>
              <MenuItem value="Pickup & Delivery">Pickup & Delivery</MenuItem>
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              label="Service Category"
              value={localDraft.service_category || 'Laundry'}
              onChange={(e) => handleFieldChange('service_category', e.target.value)}
            >
              <MenuItem value="Laundry">Wash & Steam Press</MenuItem>
              <MenuItem value="Dry Cleaning">Dry Cleaning</MenuItem>
              <MenuItem value="Wash & Fold">Wash & Fold</MenuItem>
              <MenuItem value="Steam Press Only">Steam Press Only</MenuItem>
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              label="Order Status"
              value={localDraft.order_status || localDraft.status || 'Order Received'}
              onChange={(e) => {
                handleFieldChange('order_status', e.target.value);
                handleFieldChange('status', e.target.value);
              }}
            >
              <MenuItem value="Order Received">Order Received</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Ready">Ready</MenuItem>
              <MenuItem value="Delivered">Delivered</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
          </Stack>
        )}

        {activeTab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#1e293b">
                Garments ({itemsList.length})
              </Typography>
              <Button size="small" startIcon={<Add />} onClick={handleAddItem} sx={{ textTransform: 'none' }}>
                Add Item
              </Button>
            </Box>
            {itemsList.map((it, idx) => (
              <Card key={idx} sx={{ p: 1.5, mb: 1.5, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Item Name"
                    value={it.name || ''}
                    onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                  />
                  <IconButton size="small" onClick={() => handleRemoveItem(idx)} sx={{ color: '#ef4444' }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      label="Qty"
                      value={it.qty || 1}
                      onChange={(e) => handleUpdateItem(idx, 'qty', Number(e.target.value) || 1)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      label="Rate"
                      value={it.rate || it.price || 0}
                      onChange={(e) => handleUpdateItem(idx, 'rate', Number(e.target.value) || 0)}
                    />
                  </Grid>
                </Grid>
              </Card>
            ))}
          </Box>
        )}

        {activeTab === 2 && (
          <Stack spacing={2}>
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: '#64748b' }}>
                <span>Subtotal:</span>
                <span>{currencySymbol}{subtotal.toFixed(2)}</span>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: '#64748b' }}>
                <span>GST (5%):</span>
                <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                <span>Grand Total:</span>
                <span>{currencySymbol}{grandTotal.toFixed(2)}</span>
              </Box>
            </Box>

            <TextField
              type="number"
              fullWidth
              size="small"
              label="Advance Paid"
              value={localDraft.advance_paid ?? ''}
              onChange={(e) => handleFieldChange('advance_paid', e.target.value)}
            />

            <TextField
              select
              fullWidth
              size="small"
              label="Payment Method"
              value={localDraft.payment_method || 'Cash'}
              onChange={(e) => handleFieldChange('payment_method', e.target.value)}
            >
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="UPI / QR Code">UPI / QR Code</MenuItem>
              <MenuItem value="Card">Card</MenuItem>
              <MenuItem value="Store Credit">Store Credit</MenuItem>
            </TextField>

            <TextField
              select
              fullWidth
              size="small"
              label="Payment Status"
              value={localDraft.payment_status || derivedPaymentStatus}
              onChange={(e) => handleFieldChange('payment_status', e.target.value)}
            >
              <MenuItem value="Unpaid">Unpaid</MenuItem>
              <MenuItem value="Partially Paid">Partially Paid</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
            </TextField>

            <Box sx={{ p: 1.5, bgcolor: '#eff6ff', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="#64748b" display="block">Remaining Balance Due</Typography>
              <Typography variant="h6" fontWeight={700} color={balanceDue > 0 ? '#b45309' : '#15803d'}>
                {currencySymbol}{balanceDue.toFixed(2)}
              </Typography>
            </Box>
          </Stack>
        )}

        {activeTab === 3 && (
          <Stack spacing={2}>
            <TextField
              fullWidth
              type="date"
              size="small"
              label="Expected Delivery Date"
              InputLabelProps={{ shrink: true }}
              value={localDraft.expected_delivery || ''}
              onChange={(e) => handleFieldChange('expected_delivery', e.target.value)}
            />

            {isOnCallOrderType(localDraft.order_type) && (
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    label="Pickup Date"
                    InputLabelProps={{ shrink: true }}
                    value={localDraft.scheduled_pickup_date || ''}
                    onChange={(e) => handleFieldChange('scheduled_pickup_date', e.target.value)}
                    error={Boolean(scheduleErrors.scheduled_pickup_at)}
                    helperText={scheduleErrors.scheduled_pickup_at}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="time"
                    size="small"
                    label="Pickup Time"
                    InputLabelProps={{ shrink: true }}
                    value={localDraft.scheduled_pickup_time || ''}
                    onChange={(e) => handleFieldChange('scheduled_pickup_time', e.target.value)}
                  />
                </Grid>
              </Grid>
            )}

            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  label={isOnCallOrderType(localDraft.order_type) ? 'Delivery Date' : 'Delivery Date (optional)'}
                  InputLabelProps={{ shrink: true }}
                  value={localDraft.scheduled_delivery_date || ''}
                  onChange={(e) => handleFieldChange('scheduled_delivery_date', e.target.value)}
                  error={Boolean(scheduleErrors.scheduled_delivery_at)}
                  helperText={scheduleErrors.scheduled_delivery_at}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="time"
                  size="small"
                  label={isOnCallOrderType(localDraft.order_type) ? 'Delivery Time' : 'Delivery Time (optional)'}
                  InputLabelProps={{ shrink: true }}
                  value={localDraft.scheduled_delivery_time || ''}
                  onChange={(e) => handleFieldChange('scheduled_delivery_time', e.target.value)}
                  error={Boolean(scheduleErrors.scheduled_delivery_at)}
                  helperText={scheduleErrors.scheduled_delivery_at}
                />
              </Grid>
            </Grid>

            <TextField
              select
              fullWidth
              size="small"
              label="Attending Staff"
              value={localDraft.assigned_staff || 'Counter Staff'}
              onChange={(e) => handleFieldChange('assigned_staff', e.target.value)}
            >
              <MenuItem value="Counter Staff">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                    Counter Staff
                  </Typography>
                  <Chip
                    label="Default"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      bgcolor: '#f8fafc',
                      color: '#64748b',
                      border: '1px solid #e2e8f0',
                    }}
                  />
                </Box>
              </MenuItem>
              {staffList.map((s) => (
                <MenuItem key={s.id || s.uniqueId || s.name} value={s.name}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                      {s.name}
                    </Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
                      {(s.uniqueId || s.id) && (
                        <Chip
                          label={`ID: ${s.uniqueId || s.id}`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            bgcolor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                          }}
                        />
                      )}
                      {s.zone && (
                        <Chip
                          label={`Zone: ${s.zone}`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            bgcolor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                          }}
                        />
                      )}
                      {s.city && (
                        <Chip
                          label={`City: ${s.city}`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            bgcolor: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              size="small"
              label="Assigned Driver"
              value={localDraft.assigned_driver || ''}
              onChange={(e) => handleFieldChange('assigned_driver', e.target.value)}
            >
              <MenuItem value="">
                <em>Not Assigned</em>
              </MenuItem>
              {driverList.map((d) => (
                <MenuItem key={d.id || d.uniqueId || d.name} value={d.name}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                      {d.name}
                    </Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
                      {(d.uniqueId || d.id) && (
                        <Chip
                          label={`ID: ${d.uniqueId || d.id}`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            bgcolor: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                          }}
                        />
                      )}
                      {d.zone && (
                        <Chip
                          label={`Zone: ${d.zone}`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            bgcolor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                          }}
                        />
                      )}
                      {d.city && (
                        <Chip
                          label={`City: ${d.city}`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            bgcolor: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        )}

        {activeTab === 4 && (
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Comments & Special Instructions"
            value={localDraft.comments || localDraft.special_instructions || ''}
            onChange={(e) => handleFieldChange('comments', e.target.value)}
          />
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="outlined" onClick={onClose} size="medium" sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="medium"
          startIcon={<Save />}
          disabled={saving}
          onClick={handleSave}
          sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#2563eb' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </Drawer>
  );
}

export default OrdersV2EditDrawer;
