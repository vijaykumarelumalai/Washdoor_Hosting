import * as React from 'react';
import { Box as MUIBox, CircularProgress as MUICircularProgress, Typography as MUTypography } from '@mui/material';

interface LoadingStateProps {
  text?: string;
  sx?: any;
}

export const LoadingState = ({ text = 'Loading...', sx }: LoadingStateProps) => {
  return (
    <MUIBox
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        ...sx,
      }}
    >
      <MUICircularProgress size={32} />
      <MUTypography variant="body2" sx={{ ml: 2, color: '#64748b' }}>{text}</MUTypography>
    </MUIBox>
  );
};

LoadingState.displayName = 'LoadingState';
export default LoadingState;