package com.ecubox.ecubox_backend.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class Pageables {

    private Pageables() {
    }

    public static Pageable bounded(int page, int size, int maxSize) {
        return PageRequest.of(normalizePage(page), normalizeSize(size, maxSize));
    }

    public static Pageable bounded(int page, int size, int maxSize, Sort sort) {
        return PageRequest.of(normalizePage(page), normalizeSize(size, maxSize), sort);
    }

    static int normalizePage(int page) {
        return Math.max(0, page);
    }

    static int normalizeSize(int size, int maxSize) {
        if (maxSize < 1) {
            throw new IllegalArgumentException("maxSize debe ser mayor que cero");
        }
        return Math.max(1, Math.min(maxSize, size));
    }
}
