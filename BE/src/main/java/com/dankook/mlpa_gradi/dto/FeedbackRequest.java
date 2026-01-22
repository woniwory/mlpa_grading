package com.dankook.mlpa_gradi.dto;

import lombok.Data;
import java.util.List;

@Data
public class FeedbackRequest {
    private String examCode;
    private List<FeedbackImage> images;

    @Data
    public static class FeedbackImage {
        private String fileName;
        private String studentId;  // AI 서버는 camelCase 기대
    }
}
