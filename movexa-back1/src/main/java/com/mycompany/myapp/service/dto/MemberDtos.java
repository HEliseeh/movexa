package com.mycompany.myapp.service.dto;

import com.mycompany.myapp.domain.enumeration.SubscriptionState;
import com.mycompany.myapp.service.dto.PaymentDtos.PaymentDTO;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Objets complémentaires de l'API des membres (le membre complet reste {@link MemberDTO}). */
public final class MemberDtos {

    private MemberDtos() {}

    /**
     * Version légère d'un membre : résultats de recherche, accueil, pointage, cache hors ligne.
     */
    public record MemberLiteDTO(
        Long id,
        String memberNumber,
        String firstName,
        String lastName,
        String phone,
        String planName,
        LocalDate endDate,
        SubscriptionState state,
        Long daysLeft,
        String qrToken
    ) {}

    public record SubscriptionDTO(
        Long id,
        String planName,
        Long price,
        LocalDate startDate,
        LocalDate endDate,
        boolean cancelled,
        Instant createdAt
    ) {}

    /** Tout ce qu'affiche la fiche membre, en un seul appel. */
    public record MemberOverviewDTO(
        MemberDTO member,
        List<SubscriptionDTO> subscriptions,
        List<PaymentDTO> payments,
        /** Jours de présence (entrées autorisées) sur les 30 derniers jours. */
        List<LocalDate> visitDays,
        List<ReminderDtos.ReminderDTO> reminders
    ) {}

    // ---- Import Excel / CSV ----

    public record ImportRow(
        int line,
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        /** « Nom et prénom » dans une seule colonne : découpé côté serveur. */
        @Size(max = 200) String fullName,
        @Size(max = 30) String phone,
        @Size(max = 100) String planName,
        LocalDate endDate
    ) {}

    public record ImportRequest(
        @NotNull @Size(max = 5000) List<@Valid ImportRow> rows,
        /** true : met à jour un membre existant (même téléphone) ; false : le garde tel quel. */
        boolean updateExisting,
        /** true : vérifie seulement, sans rien enregistrer. */
        boolean dryRun
    ) {}

    /** READY, DUPLICATE, MISSING_PHONE, INVALID, IMPORTED, UPDATED, SKIPPED */
    public record ImportLine(int line, String name, String phone, String planName, LocalDate endDate, String status, String message) {}

    public record ImportResult(int ready, int duplicates, int invalid, int imported, int updated, List<ImportLine> lines) {}
}
