package com.dankook.mlpa_gradi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class KafkaListenerService {

    private final SseService sseService;
    private final S3PresignService s3PresignService;
    private final ObjectMapper objectMapper;
    private final com.dankook.mlpa_gradi.repository.memory.InMemoryReportRepository inMemoryReportRepository;

    // Global deduplication: track processed S3 keys to prevent duplicates across
    // Lambda invocations
    private final java.util.Set<String> processedS3Keys = java.util.concurrent.ConcurrentHashMap.newKeySet();

    @KafkaListener(topics = { "${kafka.topics.id-result}", "${kafka.topics.answer-result}",
            "${kafka.topics.answer-fallback}" }, groupId = "mlpa-group")
    public void listen(String message) {
        try {
            log.info("[ID-RESULT] Raw: {}", message);
            processMessage(message);
        } catch (Exception e) {
            log.error("Error processing Kafka message: {}", e.getMessage());
        }
    }

    private void processMessage(String body) throws Exception {
        Map<String, Object> event = objectMapper.readValue(body, Map.class);

        String eventType = (String) event.getOrDefault("event_type",
                event.getOrDefault("eventType", "STUDENT_ID_RECOGNITION"));

        switch (eventType) {
            case "STUDENT_ID_RECOGNITION":
            case "QUESTION_RECOGNITION":
                handleRecognitionProgress(event);
                break;
            case "ATTENDANCE_UPLOAD":
                log.info("📂 Attendance file upload event received. ExamCode: {}, URL: {}", event.get("examCode"),
                        event.get("downloadUrl"));
                break;
            case "ANSWER_FALLBACK":
                String fallbackExamCode = (String) event.get("examCode");
                log.info("🚨 Fallback requested for Exam: {}, Question: {}", fallbackExamCode,
                        event.get("questionNum"));
                inMemoryReportRepository.saveFallbackItem(fallbackExamCode, event);
                sseService.sendEvent(fallbackExamCode, "fallback_required", event);
                break;
            case "ANSWER_RECOGNITION_RESULT":
                String resultExamCode = (String) event.get("examCode");
                String sid = (String) event.get("studentId");
                log.info("✅ Answer recognition result received for sid: {} in Exam: {}", sid, resultExamCode);
                inMemoryReportRepository.saveGradingResult(resultExamCode, sid, event);
                sseService.sendEvent(resultExamCode, "answer_result", event);
                break;
            case "ERROR":
                log.error("🚨 Error event received from AI Server: {}", event.get("message"));
                String errorCode = (String) event.get("examCode");
                sseService.sendEvent(errorCode, "error_occurred", event);
                break;
            default:
                log.warn("[WARN] Received unknown event type: {}", eventType);
        }
    }

    private void handleRecognitionProgress(Map<String, Object> event) throws Exception {
        // Global S3 key deduplication: prevent duplicate processing from Lambda
        // re-invocations
        String s3Key = (String) event.getOrDefault("s3Key", event.get("s3_key"));
        if (s3Key != null && !s3Key.isEmpty()) {
            if (!processedS3Keys.add(s3Key)) {
                return; // Skip duplicate
            }
        }

        // Handle snake_case and camelCase for compatibility
        String rawExamCode = (String) event.getOrDefault("examCode", event.get("exam_code"));
        String examCode = rawExamCode != null ? rawExamCode.trim().toUpperCase() : null;
        String studentId = (String) event.getOrDefault("studentId", event.get("student_id"));
        String filename = (String) event.getOrDefault("filename", event.get("fileName"));

        if (examCode == null)
            return;

        // Get or create session
        SseService.SessionInfo session = sseService.getSession(examCode);
        if (session == null) {
            log.warn("[WARN] No session found for examCode: {}", examCode);
            return;
        }

        // Deduplication
        if (filename != null && !filename.isEmpty()) {
            if (session.processedFiles.contains(filename)) {
                return; // Skip duplicate
            }
            session.processedFiles.add(filename);
        }

        int currentProgress = session.processedFiles.size();
        int total = 0;
        Object totalObj = event.getOrDefault("total", null);
        if (totalObj != null) {
            try {
                total = (int) Double.parseDouble(totalObj.toString());
            } catch (Exception ignored) {
            }
        }

        if (total <= 0) {
            total = session.total;
        } else {
            session.total = total;
        }

        if (total > 0 && currentProgress > total)
            currentProgress = total;

        String status = (String) event.getOrDefault("status", "processing");
        if (total > 0 && currentProgress >= total)
            status = "completed";

        session.index = currentProgress;
        session.status = status;
        session.lastUpdateTime = System.currentTimeMillis();

        event.put("examCode", examCode);
        event.put("index", currentProgress);
        event.put("total", total);
        event.put("status", status);

        log.info("[PROGRESS] {} -> {}/{} ({})", examCode, currentProgress, total, status);

        // Unknown ID handling
        if ("unknown_id".equals(studentId)) {
            if (filename != null) {
                String unknownS3Key = String.format("header/%s/unknown_id/%s", examCode, filename);
                String generatedUrl = s3PresignService.generatePresignedGetUrl(unknownS3Key);
                if (generatedUrl != null) {
                    List<String> urls = new java.util.ArrayList<>();
                    urls.add(generatedUrl);
                    inMemoryReportRepository.saveUnknownImages(examCode, urls);
                    event.put("presignedUrls", urls);
                }
            }
        }

        sseService.updateProgress(examCode, currentProgress, total);
        sseService.sendEvent(examCode, "recognition_update", event);
    }
}
