package com.mycompany.myapp.service.dto;

import com.mycompany.myapp.domain.enumeration.ProspectSource;
import com.mycompany.myapp.domain.enumeration.ProspectStatus;
import com.mycompany.myapp.domain.enumeration.ReminderChannel;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.LocalDate;

/** Objets échangés par l'API des prospects. */
public final class ProspectDtos {

    private ProspectDtos() {}

    public record ProspectDTO(
        Long id,
        String name,
        String phone,
        ProspectSource source,
        ProspectStatus status,
        LocalDate firstContactDate,
        String interestedPlan,
        String notes,
        Integer score,
        Instant lastInteractionAt,
        LocalDate nextFollowUp,
        Integer followUpStep,
        Long convertedMemberId,
        Instant closedAt,
        /** À relancer aujourd'hui (relance prévue échue, ou dernière chance). */
        boolean dueToday,
        /** Sous le seuil d'alerte : bientôt supprimé sans interaction. */
        boolean lastChance
    ) {}

    /** Ajout en moins de 20 secondes : téléphone et source suffisent. */
    public record ProspectRequest(
        @Size(max = 150) String name,
        @NotBlank(message = "Le téléphone est obligatoire") @Size(max = 20) String phone,
        @NotNull(message = "La source est obligatoire") ProspectSource source,
        @Size(max = 100) String interestedPlan,
        @Size(max = 500) String notes
    ) {}

    /** REPLY : a répondu ; VISIT : a demandé un tarif ou visité ; TRIAL : séance d'essai. */
    public enum Interaction {
        REPLY,
        VISIT,
        TRIAL,
    }

    public record InteractionRequest(@NotNull Interaction type) {}

    public record FollowUpRequest(@NotNull ReminderChannel channel) {}

    public record ProspectEventDTO(Long id, String label, Integer delta, Instant createdAt, String createdBy) {}

    /** Compteurs anonymes par source. */
    public record SourceStatsDTO(ProspectSource source, long converted, long lost, long expired, Double averageDaysToDecision) {}
}
