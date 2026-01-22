# AI 서버 구현 요청: 학번 인식 Fallback 엔드포인트

## 📌 개요
프론트엔드에서 학번 인식이 실패한 이미지에 대해 사용자가 수동으로 학번을 입력하면,
백엔드가 AI 서버로 해당 정보를 전달합니다. AI 서버에서 이 엔드포인트를 구현해 주세요.

---

## 🔗 엔드포인트 정보

| 항목 | 값 |
|------|-----|
| **Method** | `POST` |
| **Path** | `/fallback/student-id/` |
| **Content-Type** | `application/json` |

---

## 📥 Request Body (JSON)

```json
{
  "examCode": "5SCM9J",
  "images": [
    {
      "fileName": "1_img1.jpg",
      "studentId": "32200001"
    },
    {
      "fileName": "2_img2.jpg",
      "studentId": "32200002"
    }
  ]
}
```

### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `examCode` | `string` | 시험 코드 (6자리 영문+숫자) |
| `images` | `array` | 수정된 이미지 목록 |
| `images[].fileName` | `string` | S3에 업로드된 원본 파일 이름 |
| `images[].studentId` | `string` | 사용자가 수동 입력한 학번 |

---

## 📤 Expected Response

### 성공 시 (200 OK)
```json
{
  "status": "success",
  "message": "Fallback processed for 2 images"
}
```

### 실패 시 (4xx / 5xx)
```json
{
  "status": "error",
  "message": "Invalid exam code"
}
```

---

## 🔄 AI 서버에서 처리해야 할 로직

1. **examCode로 해당 시험 세션 조회**
2. **각 이미지에 대해:**
   - `fileName`과 매칭되는 원본 이미지 찾기
   - `student_id`를 해당 이미지의 학번으로 업데이트
   - 채점 파이프라인에 반영
3. **(선택) Kafka로 결과 전송**
   - 토픽: `mlpa-id-result`
   - 메시지 형식:
     ```json
     {
       "eventType": "STUDENT_ID_RECOGNITION",
       "examCode": "5SCM9J",
       "studentId": "32200001",
       "filename": "1_img1.jpg",
       "status": "corrected"
     }
     ```

---

## 🛠️ FastAPI 구현 예시 (Python)

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

app = FastAPI()

class FeedbackImage(BaseModel):
    fileName: str
    studentId: str

class FeedbackRequest(BaseModel):
    examCode: str
    images: List[FeedbackImage]

@app.post("/fallback/student-id/")
async def handle_student_id_fallback(request: FeedbackRequest):
    """
    학번 인식 실패 시 사용자가 수동 입력한 학번을 처리
    """
    try:
        for img in request.images:
            # TODO: 실제 로직 구현
            # 1. examCode + fileName으로 원본 이미지 조회
            # 2. studentId를 해당 이미지에 매핑
            # 3. 채점 파이프라인에 반영
            print(f"[FALLBACK] {img.fileName} -> {img.studentId}")
        
        return {
            "status": "success",
            "message": f"Fallback processed for {len(request.images)} images"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## ⚠️ 주의사항

1. **CORS 설정**: 백엔드가 `aiWebClient`로 호출하므로 CORS는 불필요 (서버-서버 통신)
2. **타임아웃**: 백엔드에서 `block()` 호출 시 기본 30초 대기, 그 안에 응답 필요
3. **에러 핸들링**: 500 에러 발생 시 백엔드가 프론트에 그대로 전달

---

## 📋 체크리스트

- [ ] `/fallback/student-id/` 엔드포인트 생성
- [ ] Request Body 파싱 (examCode, images)
- [ ] 학번 매핑 로직 구현
- [ ] 성공/실패 응답 반환
- [ ] (선택) Kafka로 결과 전송
