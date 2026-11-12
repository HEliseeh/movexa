package com.mycompany.myapp.service.dto;

import com.mycompany.myapp.domain.enumeration.CheckInMethod;
import com.mycompany.myapp.domain.enumeration.CheckInResult;
import com.mycompany.myapp.domain.enumeration.SubscriptionState;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.LocalDate;

/** Objets échangés par l'API du pointage. */
public final class CheckInDtos {

    private CheckInDtos() {}

    /**
     * Pointer un membre, identifié par son id (recherche) OU par le contenu de son QR code.
     * clientId et checkedAt servent aux pointages faits hors ligne puis synchronisés.
     */
    public record CheckInRequest(
        Long memberId,
        @Size(max = 40) String qrToken,
        @NotNull CheckInMethod method,
        @Size(max = 40) String clientId,
        Instant checkedAt
    ) {}

    public record CheckInDTO(
        Long id,
        Long memberId,
        String memberName,
        String memberNumber,
        String memberPhone,
        CheckInMethod method,
        CheckInResult result,
        Instant checkedAt,
        String agent,
        /** État de l'abonnement au moment de la réponse (peut avoir changé depuis le pointage). */
        SubscriptionState state,
        String planName,
        LocalDate endDate,
        Long daysLeft
    ) {}
}
