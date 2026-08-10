import React from 'react';
import StatusBadge from '../../../../components/StatusBadge';

interface ImportStatusTagProps {
  isActive: boolean;
}

const ImportStatusTag: React.FC<ImportStatusTagProps> = ({ isActive }) => {
  return isActive ? (
    <StatusBadge color="success">Hiện hành</StatusBadge>
  ) : (
    <StatusBadge color="default">Đã thay thế</StatusBadge>
  );
};

export default ImportStatusTag;
