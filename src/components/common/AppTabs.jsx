import * as React from 'react';
import { Tabs as MUTabs } from '@mui/material';

export const AppTabs = (props) => {
  const { ...others } = props;
  return <MUTabs {...others} />;
};