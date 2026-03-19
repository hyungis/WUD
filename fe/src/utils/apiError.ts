type ErrorLike = {
  status?: number;
  message?: string;
  code?: string;
  error?: {
    code?: string;
    message?: string;
    status?: number;
  };
  response?: {
    status?: number;
    data?: {
      message?: string;
      code?: string;
      error?: {
        code?: string;
        message?: string;
      };
    };
  };
};

export const extractApiErrorCode = (error: unknown): string | null => {
  const e = error as ErrorLike | undefined;
  return (
    e?.error?.code
    || e?.code
    || e?.response?.data?.error?.code
    || e?.response?.data?.code
    || null
  );
};

export const extractApiErrorStatus = (error: unknown): number | null => {
  const e = error as ErrorLike | undefined;
  return e?.status ?? e?.error?.status ?? e?.response?.status ?? null;
};

export const getApiErrorMessage = (error: unknown, fallback = "요청 처리 중 오류가 발생했습니다."): string => {
  const status = extractApiErrorStatus(error);

  const byStatus: Record<number, string> = {
    0: "서버와 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.",
    400: "요청 형식이 올바르지 않습니다. 입력값을 확인해 주세요.",
    401: "로그인이 만료되었습니다. 다시 로그인해 주세요.",
    403: "해당 작업에 대한 권한이 없습니다.",
    404: "요청한 정보를 찾을 수 없습니다.",
    409: "이미 처리된 요청입니다. 새로고침 후 다시 시도해 주세요.",
    429: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
    500: "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    502: "서버 연결이 불안정합니다. 잠시 후 다시 시도해 주세요.",
    503: "서비스 점검 중입니다. 잠시 후 다시 시도해 주세요.",
    504: "서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
  };

  if (status !== null && byStatus[status]) {
    return byStatus[status];
  }

  const e = error as ErrorLike | undefined;
  return (
    e?.error?.message
    || e?.response?.data?.error?.message
    || e?.response?.data?.message
    || e?.message
    || fallback
  );
};
