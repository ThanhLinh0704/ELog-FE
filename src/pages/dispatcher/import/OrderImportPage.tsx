import React, { useState, useEffect } from 'react';
import { Typography, Breadcrumb, message, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import AdminShell from '../../../components/AdminShell';
import ImportUploadCard from './components/ImportUploadCard';
import ImportReadOnlyBanner from './components/ImportReadOnlyBanner';
import ImportHistoryTable from './components/ImportHistoryTable';
import ReplaceBatchModal from './components/ReplaceBatchModal';
import { canUploadOrders } from '../../../utils/importPermissions';
import { importApi, ApiError } from '../../../api/importApi';
import type { ImportBatchHistory } from '../../../types/import';

const { Title, Paragraph } = Typography;

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

  // Duplicate delivery-date conflict (HTTP 409) awaiting confirmReplace
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ file: File; deliveryDate?: string } | null>(null);
  const [conflictDeliveryDate, setConflictDeliveryDate] = useState<string | undefined>(undefined);

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

  // Perform the actual upload. Backend parses the Excel file and is the sole
  // source of truth for order data — the FE does not re-parse the file.
  const executeUpload = async (file: File, deliveryDate?: string, confirmReplace: boolean = false) => {
    setUploadLoading(true);
    try {
      const result = await importApi.uploadOrders(file, deliveryDate, confirmReplace);

      message.success(`Tải lên file thành công. Tạo Batch #${result.batchId}`);
      setReplaceModalOpen(false);
      setPendingUpload(null);

      // Redirect to detail page directly
      navigate(`/dispatcher/import/history/${result.batchId}`);

    } catch (error: any) {
      if (!confirmReplace && error instanceof ApiError && error.status === 409) {
        // First attempt hit a duplicate-date conflict — ask the dispatcher to
        // confirm replacing it (confirmReplace=true).
        setConflictDeliveryDate(deliveryDate);
        setPendingUpload({ file, deliveryDate });
        setReplaceModalOpen(true);
      } else {
        // Either a non-conflict error, or the confirmReplace retry itself
        // failed (backend could not resolve the conflict, e.g. for a
        // multi-date batch with no explicit deliveryDate). Surface the real
        // backend message instead of silently reopening the same modal —
        // retrying again would not help.
        console.error('Upload failed', error);
        message.error(error?.message || 'Không thể xử lý file. Vui lòng thử lại.');
        setReplaceModalOpen(false);
        setPendingUpload(null);
      }
    } finally {
      setUploadLoading(false);
      setReplaceLoading(false);
    }
  };

  // Pre-upload checks
  const handleUploadInitiated = async (file: File, deliveryDate?: string) => {
    await executeUpload(file, deliveryDate, false);
  };

  const handleConfirmReplace = async () => {
    if (!pendingUpload) return;
    setReplaceLoading(true);
    await executeUpload(pendingUpload.file, pendingUpload.deliveryDate, true);
  };

  const handleCancelReplace = () => {
    setReplaceModalOpen(false);
    setPendingUpload(null);
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

      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginTop: 8, marginBottom: 8, fontWeight: 700 }}>
          Nhập đơn hàng từ Excel
        </Title>
        <Paragraph style={{ color: '#595959', fontSize: 14 }}>
          Chọn ngày giao hàng và tải file đơn hàng theo đúng định dạng mẫu để tạo đơn hàng nhanh vào hệ thống.
        </Paragraph>
      </div>

      {/* Upload Card for Dispatcher, ReadOnly Banner for managers */}
      {canImportOrders ? (
        <ImportUploadCard loading={uploadLoading} onUpload={handleUploadInitiated} />
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

      <ReplaceBatchModal
        open={replaceModalOpen}
        deliveryDateStr={conflictDeliveryDate}
        confirmLoading={replaceLoading}
        onCancel={handleCancelReplace}
        onConfirm={handleConfirmReplace}
      />
    </AdminShell>
  );
};

export default OrderImportPage;
