package com.mycompany.myapp.service;

import com.mycompany.myapp.web.rest.errors.BadRequestAlertException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Tâche planifiée : chaque nuit à 2 h (heure du Bénin), baisse la chance des prospects inactifs
 * et supprime ceux arrivés à 0 %. @EnableScheduling est déjà présent dans AsyncConfiguration.
 */
@Component
public class ProspectDecayJob {

    private static final Logger LOG = LoggerFactory.getLogger(ProspectDecayJob.class);

    private final ProspectService prospectService;

    public ProspectDecayJob(ProspectService prospectService) {
        this.prospectService = prospectService;
    }

    @Scheduled(cron = "0 0 2 * * *", zone = "Africa/Porto-Novo")
    public void run() {
        try {
            prospectService.runDecay();
        } catch (BadRequestAlertException e) {
            LOG.info("Nettoyage des prospects non relancé : {}", e.getMessage());
        }
    }
}
