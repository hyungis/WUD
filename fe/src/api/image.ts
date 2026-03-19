import api from "./axios";
import type { ApiResponse } from "../types/api";
import type {
    ImageUploadRequest, ImageUploadData,
    ImageRegisterRequest, ImageRegisterData
} from "../types/image";

export const imageApi = {
    getPresignedUrl: (data: ImageUploadRequest) => api.post<any, ApiResponse<ImageUploadData>>("/images/presigned-url", data),
    registerImage: (data: ImageRegisterRequest) => api.post<any, ApiResponse<ImageRegisterData>>("/images", data),
};
