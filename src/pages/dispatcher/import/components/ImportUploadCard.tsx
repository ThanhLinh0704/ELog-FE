import React, { useState } from 'react';
import { Card, Form, DatePicker, Upload, Button, message, Spin } from 'antd';
import { UploadOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { downloadImportTemplate } from '../../../../utils/excelTemplate';
import { validateExcelFile } from '../../../../utils/validateExcel';

interface ImportUploadCardProps {
  loading: boolean;
  onUpload: (deliveryDate: string, file: File) => void;
}

const ImportUploadCard: React.FC<ImportUploadCardProps> = ({ loading, onUpload }) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleBeforeUpload = (file: File) => {
    const errorMsg = validateExcelFile(file);
    if (errorMsg) {
      setFileError(errorMsg);
      message.error(errorMsg);
      return Upload.LIST_IGNORE;
    }
    setFileError(null);
    setFileList([file as any]);
    return false; // Prevent automatic upload
  };

  const handleRemoveFile = () => {
    setFileList([]);
    setFileError(null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (fileList.length === 0) {
        setFileError("Vui lòng chọn file Excel");
        return;
      }
      
      const file = fileList[0] as unknown as File;
      const formattedDate = values.deliveryDate.format('YYYY-MM-DD');
      
      onUpload(formattedDate, file);
    } catch (errorInfo) {
      console.log('Validation failed:', errorInfo);
    }
  };

  return (
    <Card
      title={<span style={{ fontWeight: 600, fontSize: 16 }}>Nhập đơn hàng từ Excel</span>}
      style={{
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        marginBottom: 24,
      }}
    >
      <Spin spinning={loading} tip="Đang xử lý file, vui lòng đợi...">
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
            {/* Delivery Date Field */}
            <div style={{ flex: '1 1 250px' }}>
              <Form.Item
                label={<span style={{ fontWeight: 500 }}>Ngày giao hàng</span>}
                name="deliveryDate"
                rules={[{ required: true, message: 'Vui lòng chọn ngày giao hàng' }]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: '100%', height: 40, borderRadius: 6 }}
                  disabled={loading}
                  placeholder="Chọn ngày giao hàng"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </div>

            {/* Excel File Upload Field */}
            <div style={{ flex: '1 1 350px' }}>
              <Form.Item
                label={<span style={{ fontWeight: 500 }}>File Excel đơn hàng (.xlsx)</span>}
                validateStatus={fileError ? 'error' : ''}
                help={fileError}
                required
              >
                <Upload
                  fileList={fileList}
                  beforeUpload={handleBeforeUpload}
                  onRemove={handleRemoveFile}
                  maxCount={1}
                  accept=".xlsx"
                  disabled={loading}
                >
                  {fileList.length === 0 && (
                    <Button
                      icon={<UploadOutlined />}
                      style={{
                        height: 40,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      disabled={loading}
                    >
                      Chọn file Excel
                    </Button>
                  )}
                </Upload>
                {fileList.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, color: '#1890ff' }}>
                    <FileExcelOutlined style={{ fontSize: 16 }} />
                    <span style={{ fontSize: 13, wordBreak: 'break-all' }}>{fileList[0].name}</span>
                  </div>
                )}
              </Form.Item>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
              borderTop: '1px solid #f0f0f0',
              paddingTop: 16,
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={downloadImportTemplate}
              style={{ paddingLeft: 0, fontWeight: 500 }}
              disabled={loading}
            >
              Tải xuống file mẫu
            </Button>

            <Button
              type="primary"
              onClick={handleSubmit}
              disabled={loading || fileList.length === 0}
              style={{
                height: 40,
                borderRadius: 6,
                padding: '0 24px',
                fontWeight: 600,
              }}
            >
              Tải lên
            </Button>
          </div>
        </Form>
      </Spin>
    </Card>
  );
};

export default ImportUploadCard;
