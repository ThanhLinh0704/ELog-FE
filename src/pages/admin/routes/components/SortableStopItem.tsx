import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Typography, Tooltip } from 'antd';
import { GripVertical, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import type { RouteStop } from '../../../../types/route';

const { Text, Paragraph } = Typography;

interface SortableStopItemProps {
  stop: RouteStop;
  readOnly: boolean;
  onDelete: (stop: RouteStop) => void;
}

const SortableStopItem: React.FC<SortableStopItemProps> = ({
  stop,
  readOnly,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id, disabled: readOnly });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    border: stop.hasCoordinates ? '1px solid #e2e8f0' : '1px solid #fed7aa',
    backgroundColor: stop.hasCoordinates ? '#ffffff' : '#fff7ed',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
    position: 'relative' as const,
    zIndex: isDragging ? 999 : 1,
    transitionProperty: 'box-shadow, border-color, background-color'
  };

  return (
    <div ref={setNodeRef} style={style} className={`stop-item-wrapper ${!stop.hasCoordinates ? 'missing-gps-item' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Drag Handle */}
        {!readOnly && (
          <div
            {...attributes}
            {...listeners}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              marginTop: '4px'
            }}
            aria-label="Kéo để thay đổi thứ tự điểm dừng"
          >
            <GripVertical size={18} />
          </div>
        )}

        {/* Sequence Badge */}
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: stop.hasCoordinates ? '#e2e8f0' : '#ffedd5',
          color: stop.hasCoordinates ? '#475569' : '#ea580c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 14,
          flexShrink: 0,
          marginTop: '2px'
        }}>
          {stop.sequenceOrder}
        </div>

        {/* Stop Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{stop.storeName}</h4>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>Mã CH: {stop.storeCode}</Text>
            </div>
            
            {/* Delete button (Admin only) */}
            {!readOnly && (
              <Tooltip title="Xoá khỏi tuyến">
                <Button
                  type="text"
                  danger
                  icon={<Trash2 size={16} />}
                  onClick={() => onDelete(stop)}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                />
              </Tooltip>
            )}
          </div>

          <Paragraph style={{ margin: '8px 0 0 0', color: '#475569', fontSize: 13.5 }}>
            {stop.address}
          </Paragraph>

          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {stop.hasCoordinates ? (
              <span style={{ fontSize: 12, color: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                <CheckCircle size={14} />
                Có toạ độ
              </span>
            ) : (
              <span style={{ fontSize: 12, color: '#f97316', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                <AlertTriangle size={14} />
                Chưa có toạ độ
              </span>
            )}
          </div>
        </div>
      </div>

      {/* GPS coordinates warning */}
      {!stop.hasCoordinates && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#b45309',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>⚠️ Cửa hàng này chưa có toạ độ. ETA sẽ không chính xác cho điểm dừng số {stop.sequenceOrder}.</span>
        </div>
      )}
    </div>
  );
};

export default SortableStopItem;
