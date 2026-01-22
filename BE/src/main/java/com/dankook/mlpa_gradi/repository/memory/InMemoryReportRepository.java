package com.dankook.mlpa_gradi.repository.memory;

import org.springframework.stereotype.Repository;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryReportRepository {

    // examCode -> Map<Filename, PresignedUrl>
    private final Map<String, Map<String, String>> unknownImagesCache = new ConcurrentHashMap<>();

    // examCode -> List of Fallback Events
    private final Map<String, List<Map<String, Object>>> fallbackCache = new ConcurrentHashMap<>();

    // examCode -> Map<StudentId, Map<String, Object>>
    private final Map<String, Map<String, Map<String, Object>>> gradingResultCache = new ConcurrentHashMap<>();

    public void saveFallbackItem(String examCode, Map<String, Object> fallbackItem) {
        fallbackCache.computeIfAbsent(examCode, k -> new ArrayList<>()).add(fallbackItem);
    }

    public void saveGradingResult(String examCode, String studentId, Map<String, Object> result) {
        gradingResultCache.computeIfAbsent(examCode, k -> new ConcurrentHashMap<>()).put(studentId, result);
    }

    public Map<String, Map<String, Object>> getGradingResults(String examCode) {
        return gradingResultCache.getOrDefault(examCode, new ConcurrentHashMap<>());
    }

    public List<Map<String, Object>> getFallbackItems(String examCode) {
        return fallbackCache.getOrDefault(examCode, new ArrayList<>());
    }

    public void saveUnknownImages(String examCode, List<String> urls) {
        Map<String, String> fileMap = unknownImagesCache.computeIfAbsent(examCode, k -> new ConcurrentHashMap<>());
        for (String url : urls) {
            String filename = extractAndDecodeFilename(url);
            if (filename != null) {
                fileMap.put(filename, url);
            }
        }
    }

    public List<String> getUnknownImages(String examCode) {
        Map<String, String> fileMap = unknownImagesCache.get(examCode);
        if (fileMap == null) {
            return new ArrayList<>();
        }
        return new ArrayList<>(fileMap.values());
    }

    public void clear(String examCode) {
        unknownImagesCache.remove(examCode);
    }

    private String extractAndDecodeFilename(String url) {
        if (url == null)
            return null;
        try {
            String path = url.split("\\?")[0];
            String filename = path.substring(path.lastIndexOf('/') + 1);
            return URLDecoder.decode(filename, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }
}
