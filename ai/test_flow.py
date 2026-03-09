import sys
import os

# app 폴더를 경로에 추가하여 모듈을 찾을 수 있게 함
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ultralytics import YOLO
from app.services.s3_service import s3_service


def main():
    s3_key = "photos/test2.jpg"
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "best.pt")

    print("=== S3 → YOLO 추론 테스트 ===")
    print(f"S3 Key: {s3_key}")
    print(f"모델: {model_path}\n")

    try:
        print("1. S3에서 이미지 다운로드...")
        image_path = s3_service.download_image(s3_key)
        print(f"   -> 저장 경로: {image_path}\n")

        print("2. best.pt 모델 로드 및 추론...")
        model = YOLO(model_path)
        results = model.predict(
            source=image_path,
            conf=0.25,
            save=True,
            project="htp",
            name="result",
            imgsz=640
        )
        print("   -> 추론 완료\n")

        # 저장된 결과 이미지 경로 (Ultralytics는 runs/detect/... 에 저장)
        save_dir = results[0].save_dir
        result_image = os.path.join(save_dir, os.path.basename(image_path))
        if os.path.exists(result_image):
            print(f"3. 결과 이미지 저장됨: {result_image}")
            print("\n탐지 결과:")
            first_result = results[0]
            for box in first_result.boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                class_name = first_result.names[cls_id]
                print(f"   - [{class_name}] {conf*100:.1f}%")
        else:
            print(f"⚠️ 결과 이미지를 찾을 수 없습니다. 저장 경로: {save_dir}")

    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        raise


if __name__ == "__main__":
    main()
