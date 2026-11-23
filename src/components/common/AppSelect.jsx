import * as React from 'react';
import { Select as MUISelect, MenuItem } from '@mui/material';

export const AppSelect = (props) => {
  const { label, ...others } = props;
  return (
    <div>
      <label>{label}</label>
      <MUISelect {...others}>
        <MenuItem value="">-- Select --</MenuItem>
      </MUISelect>
    </div>
  );
};