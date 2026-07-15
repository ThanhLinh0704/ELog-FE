import React, { useState, useEffect } from 'react';
import { Typography, Breadcrumb, message, Divider } from 'antd';
import AdminShell from '../../../components/AdminShell';
import ImportUploadCard from './components/ImportUploadCard';
import ImportReadOnlyBanner from './components/ImportReadOnlyBanner';
import ImportResultCard from './components/ImportResultCard';
import ImportErrorsTable from './components/ImportErrorsTable';
import ImportHistoryTable from './components/ImportHistoryTable';
import ReplaceBatchModal from './components/ReplaceBatchModal';
import ImportSuccessTable from './components/ImportSuccessTable';
import * as XLSX from 'xlsx';
import { canUploadOrders } from '../../../utils/importPermissions';
import { importApi, ApiError } from '../../../api/importApi';
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

  // Perform the actual upload
  const executeUpload = async (deliveryDate: string, file: File, confirmReplace: boolean) => {
    setUploadLoading(true);
    setCurrentResult(null);
    setErrorTableOpen(false);

    // Parse excel file in frontend to extract all successfully imported items
    let excelRows: any[] = [];
    try {
      const dataBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rowsJson = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      for (let i = 1; i < rowsJson.length; i++) {
        const row = rowsJson[i];
        if (row && row.length >= 3) {
          excelRows.push({
            rowNumber: i + 1,
            orderRef: String(row[0] || '').trim(),
            storeCode: String(row[1] || '').trim(),
            sku: String(row[2] || '').trim(),
            quantity: parseInt(String(row[3] || '0').trim()) || 0,
          });
        }
      }
    } catch (err) {
      console.error("Error parsing Excel in frontend", err);
    }

    try {
      const result = await importApi.uploadOrders(deliveryDate, file, confirmReplace);
      message.success(`Tải lên file thành công. Tạo Batch #${result.batchId}`);
      
      // Filter and save successful rows to localStorage
      try {
        const errorRowNumbers = new Set((result.errors || []).map((e: any) => e.rowNumber));
        const successRows = excelRows.filter(r => !errorRowNumbers.has(r.rowNumber));
        localStorage.setItem(`import_batch_success_rows_${result.batchId}`, JSON.stringify(successRows));
      } catch (err) {
        console.error("Error caching success rows in localStorage", err);
      }

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
      if (error instanceof ApiError && error.status === 409 && (error.body?.error === 'DUPLICATE_DELIVERY_DATE' || error.body?.code === 'DUPLICATE_DELIVERY_DATE')) {
        // Handle delivery date clash Conflict (HTTP 409)
        setPendingUpload({ deliveryDate, file });
        setReplaceModalOpen(true);
      } else {
        message.error(error?.message || 'Không thể xử lý file. Vui lòng thử lại.');
      }
    } finally {
      setUploadLoading(false);
    }
  };

  // Pre-upload checks
  const handleUploadInitiated = async (deliveryDate: string, file: File) => {
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

      {/* Success lines table details */}
      {currentResult && currentResult.acceptedRows > 0 && (
        <ImportSuccessTable batch={currentResult} />
      )}

      {/* Error lines table details */}
      {currentResult && errorTableOpen && currentResult.rejectedRows > 0 && (
        <ImportErrorsTable batchId={currentResult.batchId} />
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
