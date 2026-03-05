import sys
import os

# app 폴더를 경로에 추가하여 모듈을 찾을 수 있게 함
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.s3_service import s3_service
from app.services.yolo_service import YoloService
from app.services.llm_service import llm_service
from app.core.config import settings

def main():
    s3_key = "photos/동물가족화_동물그림01.jpg"
    
    print("=== Configuration Check ===")
    print(f"Bucket: {settings.s3_bucket_name}")
    print(f"AWS Access Key Exists: {bool(settings.aws_access_key_id)}")
    print(f"Upstage Key Exists: {bool(settings.upstage_api_key)}")
    print("===========================\n")

    try:
        print(f"1. Downloading image '{s3_key}' from S3...")
        # S3 다운로드 테스트
        image_path = s3_service.download_image(s3_key)
        print(f"-> Successfully downloaded to: {image_path}\n")

        print("2. Running Real YOLO classification...")
        classifications = YoloService.classify_image(image_path)
        print(f"-> YOLO Classifications: {classifications}\n")

        print("3. Requesting LLM analysis...")
        analysis = llm_service.analyze_results(classifications)
        print("\n=== LLM Analysis Result ===")
        print(analysis)
        print("===========================")

    except Exception as e:
        print(f"\n[ERROR] Test failed: {str(e)}")
        
if __name__ == "__main__":
    main()
