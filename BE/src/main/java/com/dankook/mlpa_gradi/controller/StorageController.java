package com.dankook.mlpa_gradi.controller;

import com.dankook.mlpa_gradi.dto.BatchPresignRequest;
import com.dankook.mlpa_gradi.dto.BatchPresignResponse;
import com.dankook.mlpa_gradi.dto.PresignRequest;
import com.dankook.mlpa_gradi.dto.PresignResponse;
import com.dankook.mlpa_gradi.service.S3PresignService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/storage")
@Slf4j
public class StorageController {

    private final S3PresignService s3PresignService;
    private final com.dankook.mlpa_gradi.service.SseService sseService;
    private final com.dankook.mlpa_gradi.service.PdfService pdfService;
    private final com.dankook.mlpa_gradi.service.KafkaProducerService kafkaProducerService;

    @org.springframework.beans.factory.annotation.Value("${aws.s3.prefix:uploads}")
    private String s3Prefix;

    // ✅ SSE 연결 (프론트가 먼저 연결)
    @CrossOrigin(origins = "*") // 직접 연결 허용
    @GetMapping(value = "/sse/connect", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> connectSSE(
            @RequestParam("examCode") String examCode,
            @RequestParam(value = "examName", required = false, defaultValue = "Unknown") String examName,
            @RequestParam(value = "total", required = false, defaultValue = "0") int total,
            jakarta.servlet.http.HttpServletResponse response) {

        // 프록시 버퍼링 방지 헤더 강제 설정
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Connection", "keep-alive");

        org.slf4j.LoggerFactory.getLogger(StorageController.class).info(
                "📥 [StorageController] SSE Connect: examCode={}, total={}", examCode, total);

        return ResponseEntity.ok(sseService.connect(examCode, examName, total));
    }

    // ✅ 배치 이미지 Presigned URL 생성 (examCode 기반)
    @PostMapping("/presigned-urls/batch")
    public BatchPresignResponse createBatchPresignedUrls(@RequestBody BatchPresignRequest request) {
        return s3PresignService.createBatchPutUrls(request);
    }

    // ✅ 단일 이미지 Presigned URL 생성
    @PostMapping("/presigned-url")
    public PresignResponse createPresignedUrl(@RequestBody PresignRequest request) {
        return s3PresignService.createPutUrl(request);
    }

    // ✅ 출석부 다운로드용 Presigned URL 생성
    @GetMapping("/attendance/download-url")
    public ResponseEntity<Map<String, String>> getAttendanceDownloadUrl(@RequestParam("examCode") String examCode) {
        String downloadUrl = s3PresignService.getAttendanceDownloadUrl(examCode);
        return ResponseEntity.ok(Map.of("url", downloadUrl));
    }

    // ✅ 출석부 업로드용 Presigned URL 생성
    @GetMapping("/presigned-url/attendance")
    public ResponseEntity<Map<String, String>> getAttendancePresignedUrl(
            @RequestParam("examCode") String examCode,
            @RequestParam("contentType") String contentType) {
        String url = s3PresignService.createAttendancePutUrl(examCode, contentType);
        return ResponseEntity.ok(Map.of("url", url));
    }

    // ✅ 현재 진행 중인 채점 프로세스 목록 조회
    @GetMapping("/active-processes")
    public ResponseEntity<java.util.List<Map<String, Object>>> getActiveProcesses() {
        return ResponseEntity.ok(sseService.getActiveProcesses());
    }

    // ✅ 현재 진행 중인 특정 채점 프로세스의 상세 정보 조회
    @GetMapping("/progress/{examCode}")
    public ResponseEntity<Map<String, Object>> getProcessProgress(@PathVariable("examCode") String examCode) {
        com.dankook.mlpa_gradi.service.SseService.SessionInfo s = sseService.getSession(examCode);
        if (s == null)
            return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of(
                "examCode", s.examCode,
                "index", s.index,
                "total", s.total,
                "status", s.status));
    }

    // ✅ 채점 프로세스 강제 중단
    @DeleteMapping("/active-processes/{examCode}")
    public ResponseEntity<Void> stopProcess(@PathVariable("examCode") String examCode) {
        sseService.removeSession(examCode);
        return ResponseEntity.ok().build();
    }

    // ✅ 출석부 업로드 완료 알림 (AI 서버에 동기 로드 요청)
    @PostMapping("/attendance/complete")
    public ResponseEntity<Map<String, Object>> completeAttendanceUpload(@RequestParam("examCode") String examCode) {
        String downloadUrl = s3PresignService.getAttendanceDownloadUrl(examCode);
        pdfService.loadAttendanceToAi(examCode, downloadUrl);
        return ResponseEntity.ok(Map.of("status", "done", "examCode", examCode));
    }

    // ✅ 이미지 업로드 완료 알림 (FE -> BE -> Kafka -> AI)
    @PostMapping("/image/complete")
    public ResponseEntity<Map<String, Object>> completeImageUpload(
            @RequestParam("examCode") String examCode,
            @RequestParam("filename") String filename,
            @RequestParam("index") int index) {

        log.info("📸 Image upload complete: examCode={}, index={}, filename={}", examCode, index, filename);

        // 1. S3 Key 복원 (S3PresignService.createBatchPutUrls와 동일한 규칙)
        // 규칙: {prefix}/{examCode}/{index}_{filename}
        String s3Key = String.format("%s/%s/%d_%s", s3Prefix, examCode, index, filename);

        // 2. AI 서버가 접근 가능한 Presigned GET URL 생성
        String downloadUrl = s3PresignService.generatePresignedGetUrl(s3Key);

        // 3. AI 팀 명세에 맞춘 카프카 메시지 생성 및 전송
        Map<String, Object> message = new java.util.HashMap<>();
        message.put("eventType", "STUDENT_ID_RECOGNITION");
        message.put("examCode", examCode);
        message.put("filename", filename);
        message.put("downloadUrl", downloadUrl);

        kafkaProducerService.sendGradingRequest(message);

        return ResponseEntity.ok(Map.of("status", "published", "examCode", examCode, "index", index));
    }
}
