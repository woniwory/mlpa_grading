package com.dankook.mlpa_gradi.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    @Value("${kafka.topics.grading-request}")
    private String gradingRequestTopic;

    @Value("${kafka.topics.id-result}")
    private String idResultTopic;

    @Value("${kafka.topics.answer-result}")
    private String answerResultTopic;

    @Bean
    public NewTopic gradingRequestTopic() {
        return TopicBuilder.name(gradingRequestTopic)
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic idResultTopic() {
        return TopicBuilder.name(idResultTopic)
                .partitions(1)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic answerResultTopic() {
        return TopicBuilder.name(answerResultTopic)
                .partitions(1)
                .replicas(1)
                .build();
    }
}
