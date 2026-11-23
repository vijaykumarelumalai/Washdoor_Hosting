import * as React from 'react';
import { Drawer as MUIDrawer, Box as MUIBox } from '@mui/material';

export const AppDrawer = (props) => {
  const { open, onClose, children, ...others } = props;
  return (
    <MUIDrawer open={open} onClose={onClose} {...others}>
      <MUIBox sx={{ p: 2 }}>{children}</MUIBox>
    </MUIDrawer>
  );
};