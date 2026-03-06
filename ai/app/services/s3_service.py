import boto3
import os
from fastapi import HTTPException
from app.core.config import settings

class S3Service:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region_name
        )
        self.bucket_name = settings.s3_bucket_name

    def download_image(self, object_key: str) -> str:
        """
        S3에서 이미지를 다운로드 받아 로컬 임시 경로를 반환합니다.
        """
        if not self.bucket_name:
            raise HTTPException(status_code=500, detail="S3_BUCKET_NAME is not configured")
        
        # 다운로드 경로 설정 (도커 컨테이너 내부 혹은 로컬의 임시 폴더)
        temp_dir = "/tmp/ai_images"
        os.makedirs(temp_dir, exist_ok=True)
        
        file_name = object_key.split("/")[-1]
        local_file_path = os.path.join(temp_dir, file_name)

        try:
            print(f"Downloading from S3: {self.bucket_name}/{object_key} to {local_file_path}")
            self.s3_client.download_file(self.bucket_name, object_key, local_file_path)
            return local_file_path
        except Exception as e:
            print(f"Error downloading from S3: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to download image from S3: {str(e)}")

s3_service = S3Service()
