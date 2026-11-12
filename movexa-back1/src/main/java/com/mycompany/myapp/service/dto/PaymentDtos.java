package com.mycompany.myapp.service.dto;

import com.mycompany.myapp.domain.enumeration.PaymentMethod;
import com.mycompany.myapp.domain.enumeration.PaymentStatus;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.LocalDate;

/** Objets échangés par l'API des encaissements. */
public final class PaymentDtos {

    private PaymentDtos() {}

    /** Un paiement tel qu'affiché (liste du jour, fiche membre, liens de paiement). */
    public record PaymentDTO(
        Long id,
        Long memberId,
        String memberName,
        String memberNumber,
        String memberPhone,
        Long planId,
        String planName,
        Long amount,
        PaymentMethod method,
        PaymentStatus status,
        String receiptNumber,
        String reference,
        /** Lien à envoyer au membre (paiement en ligne uniquement). */
        String paymentUrl,
        Instant createdAt,
        String createdBy,
        Instant paidAt,
        Instant cancelledAt,
        String cancelledBy,
        String cancelReason,
        LocalDate validFrom,
        LocalDate validTo
    ) {}

    /** Encaisser (ou envoyer un lien pour) une formule à un membre : inscription ou renouvellement. */
    public record PaymentRequest(
        @NotNull(message = "Choisissez un membre") Long memberId,
        @NotNull(message = "Choisissez une formule") Long planId,
        @NotNull(message = "Choisissez un moyen de paiement") PaymentMethod method,
        /** Montant réellement payé ; par défaut le prix de la formule (tarif spécial possible). */
        @Min(0) Long amount,
        /** Date de début voulue ; sinon : fin actuelle si encore actif, aujourd'hui si expiré. */
        LocalDate startDate,
        @Size(max = 100) String reference
    ) {}

    public record CancelRequest(@NotBlank(message = "Le motif est obligatoire") @Size(max = 300) String reason) {}

    /** Notification de l'agrégateur (format générique, à adapter à KKiaPay ou FedaPay). */
    public record WebhookPayload(@NotBlank String token, @NotBlank String transactionId, @NotBlank String status) {}

    /** Reçu partageable (image ou lien WhatsApp). */
    public record ReceiptDTO(
        Long paymentId,
        String number,
        PaymentStatus status,
        Instant paidAt,
        Long amount,
        PaymentMethod method,
        String memberName,
        String memberNumber,
        String memberPhone,
        String planName,
        LocalDate validFrom,
        LocalDate validTo,
        String agent,
        String gymName,
        String gymAddress,
        String gymPhone,
        String footer,
        String cancelReason
    ) {}
}
