import * as React from 'react';
import { Box as MUIBox, Typography as MUTypography } from '@mui/material';

export const EmptyState = (props) => {
  const { icon, title, subtitle, sx } = props;
  return (
    <MUIBox
      sx={{ py: 4, textAlign: 'center' }}
    >
      {icon && <MUTypography variant="h6" sx={{ color: '#64748b', mb: 2 }}>{icon}</MUTypography>}
      <MUTypography variant="h5" sx={{ color: '#64748b', mb: 1 }}>{title}</MUTypography>
      {subtitle && <MUTypography variant="body2" sx={{ color: '#94a3b8' }}>{subtitle}</MUTypography>}
    </MUIBox>
  );
};