export const RequestStatus = {
    IDLE: 'IDLE',
    LOADING: 'LOADING',
    PENDING: 'PENDING', // AI 분석 대기중 등
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR',
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];
