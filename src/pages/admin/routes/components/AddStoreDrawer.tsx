import React, { useState, useEffect } from 'react';
import { Drawer, Input, Button, List, Tag, Empty, Spin, message, Typography } from 'antd';
import { Search, Plus } from 'lucide-react';
import type { StoreSearchResult } from '../../../../types/route';
import { routeApi } from '../../../../api/routeApi';

const { Paragraph, Text } = Typography;

interface AddStoreDrawerProps {
  visible: boolean;
  onClose: () => void;
  onAddStore: (store: StoreSearchResult) => Promise<void>;
}

const AddStoreDrawer: React.FC<AddStoreDrawerProps> = ({
  visible,
  onClose,
  onAddStore,
}) => {
  const [stores, setStores] = useState<StoreSearchResult[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingStoreId, setAddingStoreId] = useState<string | null>(null);

  const fetchAvailableStores = async (searchKw = keyword) => {
    setLoading(true);
    try {
      const data = await routeApi.getAvailableStores(searchKw);
      setStores(data);
    } catch (e) {
      message.error('Không thể tải danh sách cửa hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchAvailableStores();
    }
  }, [visible]);

  // Debounced search
  useEffect(() => {
    if (!visible) return;
    const handler = setTimeout(() => {
      fetchAvailableStores(keyword);
    }, 300);
    return () => clearTimeout(handler);
  }, [keyword]);

  const handleAdd = async (store: StoreSearchResult) => {
    setAddingStoreId(store.id);
    try {
      await onAddStore(store);
      // Refresh local drawer stores list
      await fetchAvailableStores(keyword);
    } catch (err) {
      // Error handled by parent
    } finally {
      setAddingStoreId(null);
    }
  };

  return (
    <Drawer
      title={<span style={{ fontWeight: 700, fontSize: 16 }}>Thêm điểm dừng</span>}
      placement="right"
      width={500}
      onClose={onClose}
      open={visible}
      destroyOnClose
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
        {/* Search Input */}
        <Input
          placeholder="Tìm theo tên, mã hoặc địa chỉ cửa hàng..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          prefix={<Search size={16} style={{ color: '#bfbfbf' }} />}
          allowClear
          style={{ borderRadius: 6 }}
        />

        {/* Store List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', flex: 1 }}>
            <Spin size="medium" />
            <Paragraph style={{ marginTop: 8 }}>Đang tìm kiếm cửa hàng...</Paragraph>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <List
              dataSource={stores}
              locale={{
                emptyText: (
                  <Empty
                    description={
                      <div>
                        <Text strong style={{ display: 'block', fontSize: 14 }}>
                          Không còn cửa hàng phù hợp để thêm vào tuyến.
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Chỉ các cửa hàng đang hoạt động và chưa thuộc tuyến nào mới được hiển thị.
                        </Text>
                      </div>
                    }
                  />
                )
              }}
              renderItem={(store) => (
                <List.Item
                  style={{
                    padding: '16px',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    marginBottom: 12,
                    backgroundColor: '#fff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                  actions={[
                    <Button
                      type="primary"
                      icon={<Plus size={14} />}
                      onClick={() => handleAdd(store)}
                      loading={addingStoreId === store.id}
                      disabled={addingStoreId !== null}
                    >
                      Thêm vào tuyến
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{store.name}</span>
                        <Text type="secondary" style={{ fontSize: 12 }}>Mã: {store.code}</Text>
                      </div>
                    }
                    description={
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 13, color: '#475569' }}>{store.address}</span>
                        <div>
                          {store.hasCoordinates ? (
                            <Tag color="success" style={{ borderRadius: 4, margin: 0 }}>
                              ✅ Có toạ độ
                            </Tag>
                          ) : (
                            <Tag color="warning" style={{ borderRadius: 4, margin: 0 }}>
                              ⚠️ Chưa có toạ độ GPS
                            </Tag>
                          )}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default AddStoreDrawer;
