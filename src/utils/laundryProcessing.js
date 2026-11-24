export const PROCESSING_PRIORITIES = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Express', label: 'Express (24 Hours)' },
  { value: 'Urgent', label: 'Urgent (Same Day)' },
];

export const FACTORY_PLANTS = [
  { value: 'Main Central Laundry Plant - Ranipet #1', label: 'Main Central Laundry Plant - Ranipet #1' },
  { value: 'Vellore Branch Plant #2', label: 'Vellore Branch Plant #2' },
  { value: 'Express Unit Katpadi', label: 'Express Unit Katpadi' },
];

export const PACKAGING_TYPES = [
  { value: 'Hanger Pack', label: 'Hanger Pack' },
  { value: 'Folded & Packed', label: 'Folded & Packed' },
  { value: 'Garment Cover Bag', label: 'Garment Cover Bag' },
  { value: 'Box Packing', label: 'Box Packing' },
];

export const ASSIGNED_MACHINES = [
  { value: 'Washer Extractor #3', label: 'Washer Extractor #3' },
  { value: 'Industrial Dryer #2', label: 'Industrial Dryer #2' },
  { value: 'Steam Press Unit 4', label: 'Steam Press Unit 4' },
  { value: 'None', label: 'None' },
];

export const PROCESSING_STAGES = [
  { value: 'Received at Processing Plant', label: 'Received at Processing Plant' },
  { value: 'Washing & Cleaning Cycle', label: 'Washing & Cleaning Cycle' },
  { value: 'Steam Press & Quality Inspection', label: 'Steam Press & Quality Inspection' },
  { value: 'Packaging & Bagging Completed', label: 'Packaging & Bagging Completed' },
  { value: 'Dispatched for Store / Delivery', label: 'Dispatched for Store / Delivery' },
];

const TIMELINE_STAGES = [
  { name: 'Order Received', statusTarget: 'Order Received', match: ['order received', 'received', 'intake'] },
  { name: 'Washing', statusTarget: 'In Progress', match: ['washing', 'wash', 'in progress', 'laundry'] },
  { name: 'Steam Press & Quality Check', statusTarget: 'In Progress', match: ['steam press', 'quality check', 'quality inspection', 'iron', 'press', 'qc'] },
  { name: 'Packaging', statusTarget: 'Ready', match: ['packaging', 'packing', 'packed', 'ready'] },
  { name: 'Dispatched', statusTarget: 'Ready', match: ['dispatch', 'dispatched', 'out for delivery', 'gate out'] },
  { name: 'Delivered', statusTarget: 'Delivered', match: ['delivered', 'delivery complete', 'collection'] },
];

const stringValue = (value) => String(value ?? '').trim();

export function withCurrentOption(options, value) {
  const current = stringValue(value);
  if (!current || options.some((option) => option.value === current)) return options;
  return [...options, { value: current, label: current }];
}

export function formatLogisticsDeliveryInfo(order, pickupOption) {
  const source = order || {};
  const logistics = source.logistics || {};
  const option = pickupOption || null;
  const name = stringValue(option?.name || source.assigned_pickup_delivery_person || source.assigned_driver || logistics.assignedRider);
  const id = stringValue(option?.uniqueId || source.assigned_pickup_person_id);
  const city = stringValue(option?.city || source.assigned_pickup_person_city);
  const zone = stringValue(option?.zone || source.assigned_pickup_person_zone || logistics.routeZone || source.route_zone || source.route_from_to);
  const location = [city, zone].filter(Boolean).join(', ');
  const person = name && id ? `${name} (${id})` : (name || id);
  if (!person && !location) return 'Not Assigned';
  return [person, location].filter(Boolean).join(' - ');
}

function formatTimelineTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function currentTimelineIndex(status) {
  const raw = stringValue(status).toLowerCase();
  if (raw.includes('deliver') || raw.includes('complete') || raw.includes('dfa')) return 5;
  if (raw.includes('dispatch') || raw.includes('out for') || raw.includes('gate out')) return 4;
  if (raw.includes('pack') || raw.includes('ready') || raw.includes('billing')) return 3;
  if (raw.includes('press') || raw.includes('iron') || raw.includes('qc') || raw.includes('quality')) return 2;
  if (raw.includes('wash') || raw.includes('progress') || raw.includes('process')) return 1;
  return 0;
}

export function getProcessingTimeline(order, status) {
  const source = order || {};
  const events = [
    ...(Array.isArray(source.status_history) ? source.status_history : []),
    ...(Array.isArray(source.workflow_steps) ? source.workflow_steps : []),
    ...(Array.isArray(source.activity_history) ? source.activity_history : []),
    ...(Array.isArray(source.audit_logs) ? source.audit_logs : []),
  ];
  const currentIdx = currentTimelineIndex(status || source.status || source.order_status);
  const fallbackTimes = [
    source.created_at,
    null,
    null,
    null,
    source.factory_gate_out,
    source.delivered_at || source.collection_at,
  ];

  return TIMELINE_STAGES.map((stage, idx) => {
    const event = events.find((item) => {
      const text = stringValue(
        `${item?.title || ''} ${item?.detail || ''} ${item?.name || ''} ${item?.stage || ''} ${item?.step_name || ''}`
      ).toLowerCase();
      return stage.match.some((keyword) => text.includes(keyword));
    });
    const timestamp = event?.timestamp || event?.time || fallbackTimes[idx];
    return {
      name: stage.name,
      statusTarget: stage.statusTarget,
      time: formatTimelineTime(timestamp),
      isCompleted: idx <= currentIdx,
      isActive: idx === currentIdx,
    };
  });
}

export function getProcessingFieldValues(order) {
  const source = order || {};
  const logistics = source.logistics || {};
  const workflow = source.workflow || {};
  return {
    processingPriority: stringValue(source.priority),
    factoryPlant: stringValue(source.factory_hub || source.factory_outlet || logistics.factoryPlant || source.factory_plant),
    bagTag: stringValue(source.dispatch_bag_tag || logistics.dispatchBagTag || source.bag_tag || source.bag_barcode),
    packagingType: stringValue(source.packaging_type || source.packaging_preference),
    assignedMachine: stringValue(source.assigned_machine || workflow.assignedMachine),
    processingStage: stringValue(source.processing_stage),
    processingInstructions: stringValue(
      source.processing_instructions || source.driverInstructions || logistics.driverInstructions || source.staff_notes
    ),
    logisticsDisplay: formatLogisticsDeliveryInfo(source),
  };
}

export function buildProcessingPayload(values) {
  return {
    priority: values.processingPriority,
    factory_hub: values.factoryPlant,
    factory_outlet: values.factoryPlant,
    dispatch_bag_tag: values.bagTag,
    packaging_type: values.packagingType,
    assigned_machine: values.assignedMachine,
    processing_stage: values.processingStage,
    processing_instructions: values.processingInstructions,
  };
}
