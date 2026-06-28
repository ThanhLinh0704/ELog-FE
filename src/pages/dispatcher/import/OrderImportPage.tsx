import React, { useState, useEffect } from 'react';
import { Typography, Breadcrumb, message, Divider } from 'antd';
import AdminShell from '../../../components/AdminShell';
import ImportUploadCard from './components/ImportUploadCard';
import ImportReadOnlyBanner from './components/ImportReadOnlyBanner';
import ImportResultCard from './components/ImportResultCard';
import ImportErrorsTable from './components/ImportErrorsTable';
import ImportHistoryTable from './components/ImportHistoryTable';
import ReplaceBatchModal from './components/ReplaceBatchModal';
import { canUploadOrders } from '../../../utils/importPermissions';
import { findActiveBatchByDate, uploadOrdersMock, getImportHistoryMock } from '../../../mocks/importService';
import type { ImportBatchHistory, ImportResult } from '../../../types/import';

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
  const isDispatcher = canUploadOrders(currentUser.roles);

  // Loading states
  const [uploadLoading, setUploadLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Dialog and confirmation state
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ deliveryDate: string; file: File } | null>(null);

  // History table pagination and data state
  const [historyData, setHistoryData] = useState<ImportBatchHistory[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Upload result state
  const [currentResult, setCurrentResult] = useState<ImportResult | null>(null);
  const [errorTableOpen, setErrorTableOpen] = useState(false);

  // Load history data
  const loadHistory = async (page = currentPage, size = pageSize) => {
    setHistoryLoading(true);
    try {
      const response = await getImportHistoryMock(page, size);
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

  // Perform the actual upload
  const executeUpload = async (deliveryDate: string, file: File, confirmReplace: boolean) => {
    setUploadLoading(true);
    setCurrentResult(null);
    setErrorTableOpen(false);

    try {
      const result = await uploadOrdersMock(deliveryDate, file, { confirmReplace });
      message.success(`Tải lên file thành công. Tạo Batch #${result.batchId}`);
      setCurrentResult(result);
      if (result.rejectedRows > 0) {
        setErrorTableOpen(true);
      }
      
      // Reload history to show the new record
      await loadHistory(0, pageSize);
      setCurrentPage(0);

      // Smooth scroll to result
      setTimeout(() => {
        const resultCard = document.getElementById('import-result-card');
        if (resultCard) {
          resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

    } catch (error: any) {
      console.error('Upload failed', error);
      if (error?.code === 'ACTIVE_BATCH_EXISTS') {
        // This shouldn't happen because we check beforehand, but just in case
        message.error(error.message);
      } else {
        message.error(error?.message || 'Không thể xử lý file. Vui lòng thử lại.');
      }
    } finally {
      setUploadLoading(false);
    }
  };

  // Pre-upload checks
  const handleUploadInitiated = async (deliveryDate: string, file: File) => {
    const activeBatch = findActiveBatchByDate(deliveryDate);

    if (activeBatch) {
      setPendingUpload({ deliveryDate, file });
      setReplaceModalOpen(true);
      return;
    }

    await executeUpload(deliveryDate, file, false);
  };

  const handleConfirmReplace = async () => {
    if (!pendingUpload) return;
    setReplaceModalOpen(false);
    const { deliveryDate, file } = pendingUpload;
    setPendingUpload(null);
    await executeUpload(deliveryDate, file, true);
  };

  const handleCancelReplace = () => {
    setReplaceModalOpen(false);
    setPendingUpload(null);
  };

  const formatDateStr = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
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

      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginTop: 8, marginBottom: 8, fontWeight: 700 }}>
          Nhập đơn hàng từ Excel
        </Title>
        <Paragraph style={{ color: '#595959', fontSize: 14 }}>
          Chọn ngày giao hàng và tải file đơn hàng theo đúng định dạng mẫu để tạo đơn hàng nhanh vào hệ thống.
        </Paragraph>
      </div>

      {/* Upload Card for Dispatcher, ReadOnly Banner for managers */}
      {isDispatcher ? (
        <ImportUploadCard loading={uploadLoading} onUpload={handleUploadInitiated} />
      ) : (
        <ImportReadOnlyBanner />
      )}

      {/* Confirm replace modal dialog */}
      <ReplaceBatchModal
        open={replaceModalOpen}
        deliveryDateStr={pendingUpload ? formatDateStr(pendingUpload.deliveryDate) : ''}
        confirmLoading={uploadLoading}
        onCancel={handleCancelReplace}
        onConfirm={handleConfirmReplace}
      />

      {/* Result presentation Card */}
      {currentResult && (
        <ImportResultCard
          result={currentResult}
          onViewErrors={() => setErrorTableOpen(!errorTableOpen)}
          errorTableOpen={errorTableOpen}
        />
      )}

      {/* Error lines table details */}
      {currentResult && errorTableOpen && currentResult.errors && currentResult.errors.length > 0 && (
        <ImportErrorsTable errors={currentResult.errors} />
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
