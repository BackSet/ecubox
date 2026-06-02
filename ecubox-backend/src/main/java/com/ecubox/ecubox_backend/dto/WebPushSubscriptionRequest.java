package com.ecubox.ecubox_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record WebPushSubscriptionRequest(
        @NotBlank String endpoint,
        @Valid @NotNull Keys keys
) {
    public record Keys(
            @NotBlank String p256dh,
            @NotBlank String auth
    ) {
    }
}
