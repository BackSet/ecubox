package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioUpdateRequest {

    private String password;

    private String email;

    private Boolean enabled;

    private List<Long> roleIds;
}
