// src/types/image.ts
export interface ImageUploadRequest {
    mimeType: string;  // "image/jpeg"
    byteSize: number;
    width: number;
    height: number;
    purpose: "PROFILE" | "HTP" | "DAILY";
}

export interface ImageUploadData {
    image: {
        id: number;
        imageKey: string;
        status: string; // "UPLOADING"
    };
    upload: {
        method: string; // "PUT"
        url: string;
        headers: {
            "Content-Type": string;
        };
    };
}

export interface ImageRegisterRequest {
    imageKey: string;
    mimeType: string;
    byteSize: number;
}

export interface ImageRegisterData {
    imageId: number;
    imageKey: string;
}
