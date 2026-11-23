import * as React from 'react';
import { Box as MUIBox, Typography as MUTypography, Button as MUIButton } from '@mui/material';

export const ErrorState = (props) => {
  const { message, retry, sx } = props;
  return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="h5" sx={{ color: '#b91c1c', mb: 2 }}>{message}</Typography>
      {retry && (
        <Button variant="text" onClick={retry}>Retry</Button>
      )}
    </Box>
  );
};