package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.GymSettings;
import com.mycompany.myapp.domain.enumeration.SubscriptionState;
import com.mycompany.myapp.repository.GymSettingsRepository;
import com.mycompany.myapp.service.util.Dates;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Paramètres de la salle, et règles qui en dépendent (statut d'abonnement). */
@Service
@Transactional
public class SettingsService {

    private final GymSettingsRepository repository;

    public SettingsService(GymSettingsRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public GymSettings get() {
        return repository.findById(GymSettings.SINGLE_ID).orElseGet(() -> {
            GymSettings s = new GymSettings();
            s.setId(GymSettings.SINGLE_ID);
            return s;
        });
    }

    public GymSettings update(GymSettings input) {
        input.setId(GymSettings.SINGLE_ID);
        if (!StringUtils.hasText(input.getPaymentLinkBaseUrl())) {
            input.setPaymentLinkBaseUrl(null);
        }
        return repository.save(input);
    }

    /** Le paiement par lien n'est proposé que si le compte marchand est configuré. */
    @Transactional(readOnly = true)
    public boolean paymentLinkEnabled() {
        return StringUtils.hasText(get().getPaymentLinkBaseUrl());
    }

    /**
     * Statut d'un membre à partir de sa date de fin (dernier jour valable, inclus) :
     * pas de fin → NONE ; fin passée → EXPIRED ; fin dans N jours ou moins → EXPIRING_SOON ; sinon ACTIVE.
     */
    public SubscriptionState stateOf(LocalDate endDate, int expiringSoonDays) {
        return stateOn(endDate, Dates.today(), expiringSoonDays);
    }

    /** Même règle, évaluée à un jour donné (pointage hors ligne synchronisé plus tard). */
    public SubscriptionState stateOn(LocalDate endDate, LocalDate day, int expiringSoonDays) {
        if (endDate == null) return SubscriptionState.NONE;
        if (endDate.isBefore(day)) return SubscriptionState.EXPIRED;
        return ChronoUnit.DAYS.between(day, endDate) <= expiringSoonDays ? SubscriptionState.EXPIRING_SOON : SubscriptionState.ACTIVE;
    }

    @Transactional(readOnly = true)
    public SubscriptionState stateOf(LocalDate endDate) {
        return stateOf(endDate, get().getExpiringSoonDays());
    }
}
