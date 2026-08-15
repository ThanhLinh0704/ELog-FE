import React, { useState } from 'react';
import { Card, Upload, Button, message, Spin } from 'antd';
import { UploadOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { downloadImportTemplate } from '../../../../utils/excelTemplate';
import { validateExcelFile } from '../../../../utils/validateExcel';
import { palette } from '../../../../theme/tokens';

interface ImportUploadCardProps {
  loading: boolean;
  onUpload: (file: File) => void;
}

const ImportUploadCard: React.FC<ImportUploadCardProps> = ({ loading, onUpload }) => {
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

  const handleSubmit = () => {
    if (fileList.length === 0) {
      setFileError("Vui lòng chọn file Excel");
      return;
    }

    const file = fileList[0] as unknown as File;
    onUpload(file);
  };

  return (
    <Card
      title={<span style={{ fontWeight: 600, fontSize: 16 }}>Nhập đơn hàng từ Excel</span>}
      style={{
        borderRadius: 14,
        boxShadow: palette.cardShadow,
        marginBottom: 24,
      }}
    >
      <Spin spinning={loading} tip="Đang xử lý file, vui lòng đợi...">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
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
                    borderRadius: 8,
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: palette.primary }}>
                <FileExcelOutlined style={{ fontSize: 16 }} />
                <span style={{ fontSize: 13, wordBreak: 'break-all' }}>{fileList[0].name}</span>
              </div>
            )}

            <Button
              type="link"
              icon={<DownloadOutlined />}
              onClick={downloadImportTemplate}
              style={{ paddingLeft: 0, fontWeight: 500 }}
              disabled={loading}
            >
              Tải xuống file mẫu
            </Button>
          </div>

          <Button
            type="primary"
            onClick={handleSubmit}
            disabled={loading || fileList.length === 0}
            style={{
              height: 40,
              borderRadius: 8,
              padding: '0 24px',
              fontWeight: 600,
            }}
          >
            Tải lên
          </Button>
        </div>
        {fileError && (
          <div style={{ color: palette.danger, fontSize: 13, marginTop: 8 }}>{fileError}</div>
        )}
      </Spin>
    </Card>
  );
};

export default ImportUploadCard;
