import * as React from 'react';
import { CircularProgress as MUICircularProgress, Box as MUIBox, Typography as MUTypography } from '@mui/material';

export const LoadingState = (props) => {
  const { text = 'Loading...', sx } = props;
  return (
    <MUIBox
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}
    >
      <MUICircularProgress size={32} />
      <MUTypography variant="body2" sx={{ ml: 2, color: '#64748b' }}>{text}</MUTypography>
    </MUIBox>
  );
};