import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { type User } from '../utils/userMapper';

interface ConfirmDialogProps {
  payload: {
    user: User;
    nextActive: boolean;
  } | null;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ payload, onCancel, onConfirm, submitting }) => {
  if (!payload) return null;
  const isLock = payload.nextActive === false;

  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog">
        <div className={isLock ? 'dialog-icon danger' : 'dialog-icon success'}>
          <AlertTriangle size={24} />
        </div>
        <h3>{isLock ? 'Khoá tài khoản?' : 'Mở khoá tài khoản?'}</h3>
        <p>
          Bạn đang chuẩn bị {isLock ? 'khoá' : 'mở khoá'} tài khoản <b>{payload.user.fullName}</b>.
          Hành động này sẽ gọi API <code>PATCH /api/users/{"{id}"}/status</code>.
        </p>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel} disabled={submitting}>
            Huỷ
          </button>
          <button className={isLock ? 'btn danger' : 'btn success'} onClick={onConfirm} disabled={submitting}>
            {submitting ? <RefreshCw className="spin" size={16} /> : null}
            {isLock ? 'Khoá tài khoản' : 'Mở khoá'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
