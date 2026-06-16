import React from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  toast: {
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
  } | null;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type || 'success'}`}>
      <div>
        <strong>{toast.title}</strong>
        <p>{toast.message}</p>
      </div>
      <button onClick={onClose} aria-label="Đóng thông báo">
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
