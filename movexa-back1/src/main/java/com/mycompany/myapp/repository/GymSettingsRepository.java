package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.GymSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GymSettingsRepository extends JpaRepository<GymSettings, Long> {}
