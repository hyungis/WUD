// src/types/deep.ts
export interface DeepSessionResponse {
    sessionId: number;
    status: "DRAFT" | "ANALYZING" | "DONE" | "FAIL";
    createdAt: string;
}

export interface PsyTestRequest {
    answers: number[];
}
export interface PsyTestResponse {
    assessmentId: number;
    scoreTotal: number;
}

export interface DeepTestInfo {
    type: string;
    title: string;
    description: string;
    available: boolean;
}

export interface DeepTestGuide {
    type: string;
    title: string;
    purpose: string;
    instructions: string[];
    cautions: string[];
    disclaimer: string;
}

export interface SubmissionItem {
    imageId: number;
    type: "HOUSE" | "TREE" | "PERSON" | string;
}
export interface SubmitDrawingRequest {
    submissions: SubmissionItem[];
}
export interface SubmitDrawingResponse {
    sessionsId: number; // 오타여도 명세대로
    status: string; // "ANALYZING"
}

export interface AnalysisStatusResponse {
    sessionId: number;
    status: string; // "ANALYZING"
}

export interface DeepDetailResponse {
    sessionsId: number;
    type: string; // "HTP"
    status: string; // "DONE"
    submissions: { type: string; imageId: number; imageKey: string }[];
    questions: { id: number; orderNo: number; questionText: string }[];
    answers: { questionId: number; answerText: string }[];
    aiResult: { result: string; raw: any };
    psychAssessments: { testCode: string; scoreTotal: number; raw: any }[];
}

export interface DeepHistoryItem {
    sessionId: number;
    deepType: string;
    status: string;
    createdAt: string;
    starId: number;
}

export interface AnswerItem {
    questionId: number;
    answerText: string;
}
export interface QuestionAnswerRequest {
    answers: AnswerItem[];
}
export interface QuestionAnswerResponse {
    saved: boolean;
}
