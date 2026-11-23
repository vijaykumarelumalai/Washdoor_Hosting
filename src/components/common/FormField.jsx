import * as React from 'react';
import { TextField as MUITextField } from '@mui/material';

export const FormField = (props) => {
  const { label, ...others } = props;
  return (
    <div>
      <label>{label}</label>
      <MUITextField {...others} />
    </div>
  );
};