package com.dankook.mlpa_gradi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
@RequiredArgsConstructor
public class KafkaProducerService {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${kafka.topics.grading-request}")
    private String gradingRequestTopic;

    // 중복 송신 방지용 캐시 (examCode + filename -> timestamp)
    private final Map<String, Long> lastSentCache = new ConcurrentHashMap<>();

    public void sendGradingRequest(Map<String, Object> message) {
        String examCode = (String) message.get("examCode");
        String filename = (String) message.get("filename");
        String eventType = (String) message.get("eventType");
        String cacheKey = examCode + ":" + filename + ":" + eventType;

        long now = System.currentTimeMillis();
        if (lastSentCache.containsKey(cacheKey) && (now - lastSentCache.get(cacheKey) < 1000)) {
            log.info("🚫 [KAFKA-SKIP] Duplicate message suppressed: {}", cacheKey);
            return;
        }
        lastSentCache.put(cacheKey, now);

        try {
            String jsonMessage = objectMapper.writeValueAsString(message);
            kafkaTemplate.send(gradingRequestTopic, jsonMessage);
            log.info("📤 Sent grading request to Kafka topic {}: {}", gradingRequestTopic, jsonMessage);
        } catch (Exception e) {
            log.error("Failed to send grading request to Kafka: {}", e.getMessage());
        }
    }
}
