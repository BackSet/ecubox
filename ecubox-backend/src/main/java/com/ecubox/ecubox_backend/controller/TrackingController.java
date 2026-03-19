package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.TrackingResponse;
import com.ecubox.ecubox_backend.service.PaqueteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tracking")
public class TrackingController {

    private final PaqueteService paqueteService;

    public TrackingController(PaqueteService paqueteService) {
        this.paqueteService = paqueteService;
    }

    @GetMapping
    public ResponseEntity<TrackingResponse> getByNumeroGuia(
            @RequestParam(name = "numeroGuia") String numeroGuia) {
        return ResponseEntity.ok(paqueteService.findByNumeroGuiaForTracking(numeroGuia));
    }
}
