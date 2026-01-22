package com.dankook.mlpa_gradi.controller;

import com.dankook.mlpa_gradi.dto.FeedbackRequest;
import com.dankook.mlpa_gradi.dto.SubjectiveFeedbackRequest;
import com.dankook.mlpa_gradi.service.FeedbackService;
import com.dankook.mlpa_gradi.service.StudentAnswerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@Slf4j
@RequiredArgsConstructor
public class FeedbackController {

    private final StudentAnswerService studentAnswerService;
    private final FeedbackService feedbackService;
    private final com.dankook.mlpa_gradi.repository.memory.InMemoryReportRepository inMemoryReportRepository;

    // ✅ Fallback 항목 조회 (FE에서 호출)
    @GetMapping("/fallback-items")
    public ResponseEntity<?> getFallbackItems(@RequestParam("examCode") String examCode) {
        log.info("Fetching fallback items for exam: {}", examCode);
        return ResponseEntity.ok(inMemoryReportRepository.getFallbackItems(examCode));
    }

    // ✅ 채점 결과 JSON 조회 (FE에서 호출)
    @GetMapping("/grading-results")
    public ResponseEntity<?> getGradingResults(@RequestParam("examCode") String examCode) {
        log.info("Fetching grading results for exam: {}", examCode);
        return ResponseEntity.ok(inMemoryReportRepository.getGradingResults(examCode));
    }

    // 기존 Recognition Fallback (서술형/인식실패 정답 수정)
    // payload: { examCode, questions: [{ questionNumber, correctAnswer }] }
    // 여기서는 간단히 처리하거나 서비스로 위임
    @PostMapping("/question-feedback")
    public ResponseEntity<?> submitQuestionFeedback(@RequestBody Map<String, Object> payload) {
        log.info("Received question feedback: {}", payload);
        // TODO: Implement actual logic for correcting answers (updating answer key or
        // student answers)
        // For now just return OK
        return ResponseEntity.ok("Feedback received");
    }

    // 새로운 Subjective (Others) Feedback
    @PostMapping("/subjective-feedback")
    public ResponseEntity<?> submitSubjectiveFeedback(@RequestBody SubjectiveFeedbackRequest request) {
        log.info("Received subjective feedback for exam: {}", request.getExamCode());

        try {
            studentAnswerService.updateSubjectiveFeedback(request.getExamCode(), request.getEvaluations());
            return ResponseEntity.ok("Subjective feedback updated");
        } catch (Exception e) {
            log.error("Error updating subjective feedback", e);
            return ResponseEntity.badRequest().body("Error updating feedback: " + e.getMessage());
        }
    }

    // ✅ 학번 인식 피드백 전송 (FE -> BE -> AI /fallback/student-id/)
    @PostMapping("/student/id/feedback")
    public ResponseEntity<?> submitStudentIdFeedback(@RequestBody FeedbackRequest request) {
        log.info("Received student ID feedback for exam: {}", request.getExamCode());
        try {
            feedbackService.sendFeedback(request);
            return ResponseEntity.ok("Student ID feedback forwarded to AI server");
        } catch (Exception e) {
            log.error("Error forwarding student ID feedback", e);
            return ResponseEntity.internalServerError().body("Failed to forward feedback: " + e.getMessage());
        }
    }
}
