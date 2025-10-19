import React from 'react';
import { Tag } from 'antd';

export const formatPercentTag = (value?: number) => {
  if (value === null || value === undefined) {
    return '-';
  }
  const color = value >= 0 ? 'success' : 'error';
  return <Tag color={color}>{`${value.toFixed(2)}%`}</Tag>;
};
