import React from 'react';
import { Tag } from 'antd';

interface ImportStatusTagProps {
  isActive: boolean;
}

const ImportStatusTag: React.FC<ImportStatusTagProps> = ({ isActive }) => {
  return isActive ? (
    <Tag color="success" style={{ borderRadius: 4, fontWeight: 500 }}>
      Hiện hành
    </Tag>
  ) : (
    <Tag color="default" style={{ borderRadius: 4, fontWeight: 500, color: '#8c8c8c' }}>
      Đã thay thế
    </Tag>
  );
};

export default ImportStatusTag;
