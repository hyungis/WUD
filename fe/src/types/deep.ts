// src/types/deep.ts
export interface DeepSessionResponse {
    sessionId: number;
    status: "DRAFT" | "ANALYZING" | "DONE" | "FAILED";
}

export interface PsyTestRequest {
    answers: number[];
}
export interface PsyTestResponse {
    assessmentId: number;
    scoreTotal: number;
}

export interface SpaneTestRequest {
    answers: number[];
}

export interface SpaneTestResponse {
    assessmentId: number;
    scorePositive: number;
    scoreNegative: number;
    scoreBalance: number;
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
    houseImageId: number;
    treeImageId: number;
    personImageId: number;
}
export interface SubmitSingleDrawingRequest {
    imageId: number;
    type: "RAIN_PERSON" | "STAR_WAVE";
}
export interface SubmitDrawingResponse {
    sessionId: number;
    status: "DRAFT" | "ANALYZING" | "DONE" | "FAILED";
}

export interface AnalysisStatusResponse {
    sessionId: number;
    status: "DRAFT" | "ANALYZING" | "DONE" | "FAILED";
}

export interface DeepDetailResponse {
    sessionId: number;
    deepType: "HTP" | "PERSON_IN_RAIN" | "STAR_WAVE";
    status: "DRAFT" | "ANALYZING" | "DONE" | "FAILED";
    submissions: { type: string; imageId: number; imageKey: string; imageUrl?: string }[];
    questions: string[];
    aiResult: {
        result?: string;
        resultSummary?: string;
        questions?: string[];
        raw: Record<string, unknown>;
    };
    psychAssessments: { testCode: string; scoreTotal: number; raw: Record<string, unknown> }[];
}

export interface DeepHistoryItem {
    sessionId: number;
    deepType: string;
    status: string;
    createdAt: string;
    resultSummary?: string | null;
}

export interface AnswerItem {
    questionId: number;
    answerText: string;
}

export interface QuestionAnswerRequest {
    answers: AnswerItem[];
}

export interface QuestionAnswerResponse {
    saved?: boolean;
}
