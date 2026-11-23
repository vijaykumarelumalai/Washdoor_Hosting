import * as React from 'react';
import { Chip as MUIChip } from '@mui/material';

export const StatusChip = (props) => {
  const { status, sx } = props;
  const colorMap = {
    'In Progress': { bg: '#fef3c7', color: '#b45309' },
    'Ready': { bg: '#dcfce7', color: '#15803d' },
    'Delivered': { bg: '#dcfce7', color: '#15803d' },
    'Cancelled': { bg: '#fee2e2', color: '#b91c1c' },
    'Order Received': { bg: '#eff6ff', color: '#1d4ed8' },
  };
  const styles = colorMap[status] || colorMap['Order Received'];
  return (
    <MUIChip
      sx={{ backgroundColor: styles.bg, color: styles.color }}
    >
      {status}
    </MUIChip>
  );
};