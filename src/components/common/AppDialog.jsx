import * as React from 'react';
import { Dialog as MUIDialog, DialogTitle as MUIDialogTitle, DialogContent as MUIDialogContent, DialogActions as MUIDialogActions } from '@mui/material';
import { Button as MUIButton } from '@mui/material';

export const AppDialog = (props) => {
  const { open, onClose, children, ...others } = props;
  return (
    <MUIDialog open={open} onClose={onClose} {...others}>
      <MUIDialogTitle>Edit Order</MUIDialogTitle>
      <MUIDialogContent>{children}</MUIDialogContent>
      <MUIDialogActions>
        <MUIButton onClick={onClose}>Cancel</MUIButton>
        <MUIButton variant="contained" autoFocus>Save</MUIButton>
      </MUIDialogActions>
    </MUIDialog>
  );
};