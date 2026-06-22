export function getApiStatus(err: any) {
  return err?.response?.status ?? err?.status;
}

export function getApiErrorCode(err: any) {
  return (
    err?.response?.data?.error?.code ||
    err?.response?.data?.code ||
    err?.body?.error?.code ||
    err?.body?.code ||
    err?.code
  );
}

export function getApiErrorField(err: any) {
  return (
    err?.response?.data?.error?.field ||
    err?.response?.data?.field ||
    err?.body?.error?.field ||
    err?.body?.field
  );
}

export function getApiErrorMessage(
  err: any,
  fallback = 'Có lỗi xảy ra, vui lòng thử lại.'
) {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.response?.data?.errors?.[0]?.message ||
    err?.body?.error?.message ||
    err?.body?.message ||
    err?.message ||
    fallback
  );
}

export function getApiFieldErrors(err: any): Record<string, string> {
  const data = err?.response?.data ?? err?.body;
  const result: Record<string, string> = {};

  const directField =
    data?.error?.field ||
    data?.field;

  const directMessage =
    data?.error?.message ||
    data?.message;

  if (directField && directMessage) {
    result[directField] = directMessage;
  }

  if (Array.isArray(data?.errors)) {
    data.errors.forEach((item: any) => {
      const field = item.field || item.name;
      const message = item.message || item.defaultMessage;

      if (field && message) {
        result[field] = message;
      }
    });
  }

  return result;
}