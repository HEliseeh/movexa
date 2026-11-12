package com.mycompany.myapp.web.rest;

import com.mycompany.myapp.domain.GymSettings;
import com.mycompany.myapp.security.AuthoritiesConstants;
import com.mycompany.myapp.service.DashboardService;
import com.mycompany.myapp.service.SettingsService;
import com.mycompany.myapp.service.dto.DashboardDtos.DashboardDTO;
import com.mycompany.myapp.service.dto.DashboardDtos.ReceptionTodayDTO;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Tableau de bord (gérant), accueil (réceptionniste) et paramètres de la salle. */
@RestController
@RequestMapping("/api")
public class DashboardResource {

    private final DashboardService dashboardService;
    private final SettingsService settingsService;

    public DashboardResource(DashboardService dashboardService, SettingsService settingsService) {
        this.dashboardService = dashboardService;
        this.settingsService = settingsService;
    }

    /** GET /api/dashboard?period=DAY|WEEK|MONTH : chiffres financiers, réservés au gérant. */
    @GetMapping("/dashboard")
    @PreAuthorize(AuthoritiesConstants.IS_MANAGER)
    public DashboardDTO dashboard(@RequestParam(defaultValue = "MONTH") String period) {
        return dashboardService.dashboard(period);
    }

    @GetMapping("/reception/today")
    public ReceptionTodayDTO receptionToday() {
        return dashboardService.receptionToday();
    }

    /** Lecture pour tous (nom de la salle sur les reçus, seuil « expire bientôt »…). */
    @GetMapping("/settings")
    public GymSettings settings() {
        return settingsService.get();
    }

    @PutMapping("/settings")
    @PreAuthorize(AuthoritiesConstants.IS_MANAGER)
    public GymSettings updateSettings(@Valid @RequestBody GymSettings settings) {
        return settingsService.update(settings);
    }
}
