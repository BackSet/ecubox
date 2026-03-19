package com.ecubox.ecubox_backend;

import com.ecubox.ecubox_backend.config.EnvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EcuboxSistemaDeGestionApplication {

	public static void main(String[] args) {
		EnvLoader.load();
		SpringApplication.run(EcuboxSistemaDeGestionApplication.class, args);
	}

}
