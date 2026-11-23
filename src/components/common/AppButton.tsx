import * as React from 'react';
import { Button as MUIButton, ButtonProps } from '@mui/material';

export const AppButton = React.forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'sx' | 'className'> & { sx?: any; className?: string }
>((props, ref) => {
  const { sx, className, ...others } = props;
  return (
    <MUIButton
      ref={ref}
      sx={sx}
      className={className}
      {...others}
    />
  );
});

AppButton.displayName = 'AppButton';
export default AppButton;