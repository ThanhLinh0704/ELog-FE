import React, { useState, useEffect } from 'react';
import { Breadcrumb, message, Divider } from 'antd';
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

  // Perform the actual upload. Backend parses the Excel file and is the sole
  // source of truth for order data — the FE does not re-parse the file.
  // Duplicate-date imports are no longer rejected batch-level (ImportServiceImpl
  // dropped the confirmReplace/existingActiveBatches mechanism — protection now
  // lives only at the row level), so every upload just creates a new batch.
  const handleUploadInitiated = async (file: File, deliveryDate?: string) => {
    setUploadLoading(true);
    try {
      const result = await importApi.uploadOrders(file, deliveryDate);

      message.success(`Tải lên file thành công. Tạo Batch #${result.batchId}`);

      // Redirect to detail page directly
      navigate(`/dispatcher/import/history/${result.batchId}`);
    } catch (error: any) {
      console.error('Upload failed', error);
      message.error(error?.message || 'Không thể xử lý file. Vui lòng thử lại.');
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
        subtitle="Chọn ngày giao hàng và tải file đơn hàng theo đúng định dạng mẫu để tạo đơn hàng nhanh vào hệ thống."
        icon={<FileSpreadsheet size={20} />}
      />

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
    </AdminShell>
  );
};

export default OrderImportPage;
