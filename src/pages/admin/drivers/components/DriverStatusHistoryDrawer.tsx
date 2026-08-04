import React, { useEffect, useState } from 'react';
import { Drawer, Table, Tag, Typography, message } from 'antd';
import { getDriverStatusHistory } from '../../../../api/driverApi';
import { DRIVER_STATUS_LABEL, REASON_CODE_LABEL, type DriverStatusHistoryEntry } from '../../../../types/driver';

const { Text } = Typography;

interface DriverStatusHistoryDrawerProps {
  visible: boolean;
  driverId: number | null;
  driverName: string;
  onClose: () => void;
}

const DriverStatusHistoryDrawer: React.FC<DriverStatusHistoryDrawerProps> = ({
  visible,
  driverId,
  driverName,
  onClose,
}) => {
  const [entries, setEntries] = useState<DriverStatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!visible || driverId == null) return;
    setPage(0);
  }, [visible, driverId]);

  useEffect(() => {
    if (!visible || driverId == null) return;
    let cancelled = false;
    setLoading(true);
    getDriverStatusHistory(driverId, { page, size })
      .then((result) => {
        if (cancelled) return;
        setEntries(result.items);
        setTotal(result.pagination.totalElements);
      })
      .catch((err: Error) => {
        if (!cancelled) message.error(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, driverId, page, size]);

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'changedAt',
      key: 'changedAt',
      render: (text: string) => text || '—',
    },
    {
      title: 'Thay đổi',
      key: 'change',
      render: (_: unknown, record: DriverStatusHistoryEntry) => (
        <>
          <Tag color={DRIVER_STATUS_LABEL[record.statusBefore].color}>
            {DRIVER_STATUS_LABEL[record.statusBefore].label}
          </Tag>
          {' → '}
          <Tag color={DRIVER_STATUS_LABEL[record.statusAfter].color}>
            {DRIVER_STATUS_LABEL[record.statusAfter].label}
          </Tag>
        </>
      ),
    },
    {
      title: 'Lý do',
      key: 'reason',
      render: (_: unknown, record: DriverStatusHistoryEntry) => (
        <>
          {record.reasonCode ? <div>{REASON_CODE_LABEL[record.reasonCode]}</div> : '—'}
          {record.reasonNote ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.reasonNote}
            </Text>
          ) : null}
        </>
      ),
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'changedByName',
      key: 'changedByName',
      render: (text: string) => text || '—',
    },
  ];

  return (
    <Drawer
      title={`Lịch sử trạng thái · ${driverName}`}
      open={visible}
      onClose={onClose}
      width={640}
    >
      <Table
        columns={columns}
        dataSource={entries}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page + 1,
          pageSize: size,
          total,
          onChange: (p, s) => {
            setPage(p - 1);
            if (s) setSize(s);
          },
        }}
      />
    </Drawer>
  );
};

export default DriverStatusHistoryDrawer;
