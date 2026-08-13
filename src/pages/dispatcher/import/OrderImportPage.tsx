import React, { useState, useEffect } from 'react';
import { Breadcrumb, message, Divider, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import PageHeader from '../../../components/PageHeader';
import ImportUploadCard from './components/ImportUploadCard';
import ImportReadOnlyBanner from './components/ImportReadOnlyBanner';
import ImportHistoryTable from './components/ImportHistoryTable';
import { canUploadOrders } from '../../../utils/importPermissions';
import { importApi } from '../../../api/importApi';
import type { ImportBatchHistory } from '../../../types/import';

function getCurrentUser() {
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';

  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch (err) {
    console.error('Failed to parse roles in OrderImportPage', err);
  }

  return {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };
}

const OrderImportPage: React.FC = () => {
  const currentUser = getCurrentUser();
  const canImportOrders = canUploadOrders();
  const navigate = useNavigate();

  // Loading states
  const [uploadLoading, setUploadLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // History table pagination and data state
  const [historyData, setHistoryData] = useState<ImportBatchHistory[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Load history data
  const loadHistory = async (page = currentPage, size = pageSize) => {
    setHistoryLoading(true);
    try {
      const response = await importApi.getImportHistory({ page, size });
      setHistoryData(response.content);
      setTotalElements(response.totalElements);
    } catch (error) {
      console.error('Failed to load import history', error);
      message.error('Không thể tải lịch sử import. Vui lòng thử lại.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(0, pageSize);
    setCurrentPage(0);
  }, []);

  const handlePageChange = (page: number, size?: number) => {
    const newSize = size || pageSize;
    setCurrentPage(page);
    setPageSize(newSize);
    loadHistory(page, newSize);
  };

  const handleUploadInitiated = async (file: File, confirmReplace: boolean = false) => {
    setUploadLoading(true);
    try {
      const result = await importApi.uploadOrders(file, confirmReplace);

      message.success(`Tải lên file thành công. Tạo Batch #${result.batchId}`);
      navigate(`/dispatcher/import/history/${result.batchId}`);
    } catch (error: any) {
      console.error('Upload failed', error);

      const isDuplicateError =
        error?.status === 409 ||
        error?.body?.code === 'DUPLICATE_ORDERS_EXIST';

      if (isDuplicateError) {
        // Parse danh sách mã đơn từ message BE: "Phát hiện N đơn hàng đã tồn tại: DH01, DH02, ..."
        const rawMsg: string = error?.message || '';
        const colonIdx = rawMsg.lastIndexOf(':');
        const orderCodes: string[] = colonIdx >= 0
          ? rawMsg.slice(colonIdx + 1).split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];

        Modal.confirm({
          title: 'Phát hiện đơn hàng trùng lặp',
          icon: null,
          width: 480,
          content: (
            <div style={{ fontSize: 14 }}>
              <p style={{ marginBottom: 12, color: '#262626' }}>
                Có <strong style={{ color: '#fa8c16' }}>{orderCodes.length > 0 ? orderCodes.length : 'một số'}</strong> đơn hàng trong file đã tồn tại trên hệ thống.
              </p>
              {orderCodes.length > 0 && (
                <div
                  style={{
                    maxHeight: 160,
                    overflowY: 'auto',
                    background: '#fafafa',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 12,
                  }}
                >
                  {orderCodes.map((code) => (
                    <span
                      key={code}
                      style={{
                        display: 'inline-block',
                        background: '#fff7e6',
                        border: '1px solid #ffd591',
                        borderRadius: 4,
                        padding: '2px 8px',
                        margin: '3px 4px 3px 0',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        color: '#d46b08',
                      }}
                    >
                      {code}
                    </span>
                  ))}
                </div>
              )}
              <p style={{ margin: 0, color: '#595959' }}>
                Bạn có muốn <strong>gộp đơn</strong> (cộng dồn số lượng vào đơn cũ) không?
              </p>
            </div>
          ),
          okText: 'Gộp đơn',
          cancelText: 'Hủy',
          okButtonProps: { type: 'primary' },
          onOk: async () => {
            await handleUploadInitiated(file, true);
          },
          onCancel: () => {
            message.info('Đã hủy thao tác nhập đơn hàng.');
          },
        });
      } else {
        message.error(error?.message || 'Không thể xử lý file. Vui lòng thử lại.');
      }
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Nhập đơn hàng từ Excel' },
          ]}
        />
      </div>

      <PageHeader
        title="Nhập đơn hàng từ Excel"
        subtitle="Tải file Excel đơn hàng theo đúng định dạng mẫu. Ngày giao hàng sẽ được đọc từ cột Ngày giao trong file."
        icon={<FileSpreadsheet size={20} />}
      />

      {/* Upload Card for Dispatcher, ReadOnly Banner for managers */}
      {canImportOrders ? (
        <ImportUploadCard loading={uploadLoading} onUpload={(file) => handleUploadInitiated(file)} />
      ) : (
        <ImportReadOnlyBanner />
      )}

      <Divider style={{ margin: '32px 0' }} />

      {/* History table */}
      <ImportHistoryTable
        data={historyData}
        loading={historyLoading}
        totalElements={totalElements}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </AdminShell>
  );
};

export default OrderImportPage;
