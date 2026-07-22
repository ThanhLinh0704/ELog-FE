import React, { useState, useEffect } from 'react';
import { Typography, Breadcrumb, message, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import AdminShell from '../../../components/AdminShell';
import ImportUploadCard from './components/ImportUploadCard';
import ImportReadOnlyBanner from './components/ImportReadOnlyBanner';
import ImportHistoryTable from './components/ImportHistoryTable';
import * as XLSX from 'xlsx';
import { canUploadOrders } from '../../../utils/importPermissions';
import { importApi } from '../../../api/importApi';
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

  // Perform the actual upload
  const executeUpload = async (deliveryDate: string, file: File) => {
    setUploadLoading(true);

    // Parse excel file in frontend to extract all successfully imported items
    let excelRows: any[] = [];
    try {
      const dataBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rowsJson = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      const orderRefIdx = 0;
      const storeCodeIdx = 1;
      const skuIdx = 2;
      const quantityIdx = 3;
      const timeWindowIdx = 4;
      const recipientNameIdx = 5;
      const recipientPhoneIdx = 6;
      const notesIdx = 7;

      for (let i = 1; i < rowsJson.length; i++) {
        const row = rowsJson[i] as any[];
        if (row && row.length > 0) {
          const orderRef = orderRefIdx < row.length ? String(row[orderRefIdx] || '').trim() : '';
          const storeCode = storeCodeIdx < row.length ? String(row[storeCodeIdx] || '').trim() : '';
          const sku = skuIdx < row.length ? String(row[skuIdx] || '').trim() : '';
          const quantity = quantityIdx < row.length ? (parseInt(String(row[quantityIdx] || '0').trim()) || 0) : 0;
          const deliveryTimeWindow = timeWindowIdx < row.length ? String(row[timeWindowIdx] || '').trim() : '';
          const recipientName = recipientNameIdx < row.length ? String(row[recipientNameIdx] || '').trim() : '';
          const recipientPhone = recipientPhoneIdx < row.length ? String(row[recipientPhoneIdx] || '').trim() : '';
          const notes = notesIdx < row.length ? String(row[notesIdx] || '').trim() : '';

          if (storeCode || sku) {
            excelRows.push({
              rowNumber: i + 1,
              orderRef,
              storeCode,
              sku,
              quantity,
              deliveryTimeWindow,
              recipientName,
              recipientPhone,
              notes,
            });
          }
        }
      }
    } catch (err) {
      console.error("Error parsing Excel in frontend", err);
    }

    try {
      const result = await importApi.uploadOrders(deliveryDate, file, false);
      
      // Filter and save successful rows to localStorage
      try {
        const errorRowNumbers = new Set((result.errors || []).map((e: any) => e.rowNumber));
        const successRows = excelRows.filter(r => !errorRowNumbers.has(r.rowNumber));
        localStorage.setItem(`import_batch_success_rows_${result.batchId}`, JSON.stringify(successRows));
      } catch (err) {
        console.error("Error caching success rows in localStorage", err);
      }

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

  // Pre-upload checks
  const handleUploadInitiated = async (deliveryDate: string, file: File) => {
    await executeUpload(deliveryDate, file);
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
    </AdminShell>
  );
};

export default OrderImportPage;
