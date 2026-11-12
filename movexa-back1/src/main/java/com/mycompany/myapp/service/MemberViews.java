package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.Member;
import com.mycompany.myapp.service.dto.MemberDTO;
import com.mycompany.myapp.service.dto.MemberDtos.MemberLiteDTO;
import com.mycompany.myapp.service.util.Dates;
import com.mycompany.myapp.security.SecurityUtils;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Component;

/**
 * Petites conversions partagées par plusieurs services (membre → version légère, statut, nom).
 * Évite les dépendances circulaires entre services.
 */
@Component
public class MemberViews {

    private final SettingsService settingsService;

    public MemberViews(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    /** Seuil « expire bientôt » de la salle (lu une fois par requête, puis passé en paramètre). */
    public int threshold() {
        return settingsService.get().getExpiringSoonDays();
    }

    public MemberLiteDTO lite(Member m, int threshold) {
        return new MemberLiteDTO(
            m.getId(),
            m.getMemberNumber(),
            m.getUser().getFirstName(),
            m.getUser().getLastName(),
            m.getUser().getPhone(),
            m.getPlan(),
            m.getExpiryDate(),
            settingsService.stateOf(m.getExpiryDate(), threshold),
            daysLeft(m.getExpiryDate()),
            m.getQrToken()
        );
    }

    /** Ajoute au DTO complet les champs calculés. */
    public MemberDTO enrich(MemberDTO dto, int threshold) {
        dto.setState(settingsService.stateOf(dto.getExpiryDate(), threshold));
        dto.setDaysLeft(daysLeft(dto.getExpiryDate()));
        return dto;
    }

    public static Long daysLeft(LocalDate end) {
        return end == null ? null : ChronoUnit.DAYS.between(Dates.today(), end);
    }

    public static String fullName(Member m) {
        return (m.getUser().getFirstName() + " " + m.getUser().getLastName()).trim();
    }

    /** Login de l'utilisateur connecté (gérant ou réceptionniste), pour la traçabilité. */
    public static String currentAgent() {
        return SecurityUtils.getCurrentUserLogin().orElse("système");
    }
}
