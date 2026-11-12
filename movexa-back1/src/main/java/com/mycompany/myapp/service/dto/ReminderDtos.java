package com.mycompany.myapp.service.dto;

import com.mycompany.myapp.domain.enumeration.ReminderChannel;
import com.mycompany.myapp.domain.enumeration.ReminderRule;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.LocalDate;

/** Objets échangés par l'API des relances membres. */
public final class ReminderDtos {

    private ReminderDtos() {}

    /** Relance à faire aujourd'hui, avec le message déjà rédigé. */
    public record ReminderQueueItem(
        Long memberId,
        String memberName,
        String phone,
        ReminderRule rule,
        ReminderChannel channel,
        LocalDate targetEndDate,
        String planName,
        Long amount,
        boolean expired,
        String message
    ) {}

    public record ReminderSendRequest(
        @NotNull Long memberId,
        @NotNull ReminderRule rule,
        @NotNull ReminderChannel channel,
        LocalDate targetEndDate,
        @Size(max = 600) String message
    ) {}

    /** Relance envoyée, avec son résultat (renouvelé ou non). */
    public record ReminderDTO(
        Long id,
        Long memberId,
        String memberName,
        ReminderRule rule,
        ReminderChannel channel,
        LocalDate targetEndDate,
        Instant sentAt,
        String sentBy,
        /** RENEWED, WAITING, NO_RESPONSE */
        String outcome,
        String outcomeText
    ) {}

    public record ReminderStatsDTO(long sent, long sms, long whatsapp, long renewed, long recoveredAmount, long toSendToday) {}
}
