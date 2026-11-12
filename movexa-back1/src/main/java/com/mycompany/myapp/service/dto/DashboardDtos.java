package com.mycompany.myapp.service.dto;

import com.mycompany.myapp.domain.CashClosure;
import com.mycompany.myapp.domain.enumeration.PaymentMethod;
import com.mycompany.myapp.service.dto.MemberDtos.MemberLiteDTO;
import com.mycompany.myapp.service.dto.ProspectDtos.ProspectDTO;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Tableau de bord du gérant, accueil du réceptionniste et clôture de caisse. */
public final class DashboardDtos {

    private DashboardDtos() {}

    public record DayCount(LocalDate day, long count) {}

    /** Membre à suivre dans une liste du tableau de bord. */
    public record DueMember(MemberLiteDTO member, long reminderCount) {}

    public record DashboardDTO(
        String period,
        LocalDate from,
        long totalPaid,
        /** Montant par moyen de paiement (toutes les clés présentes, 0 si rien). */
        Map<PaymentMethod, Long> paidByMethod,
        long paymentsCount,
        long cancelledCount,
        long activeMembers,
        long newMembers,
        long expiredMembers,
        long remindersSentWeek,
        long renewedAfterReminderWeek,
        List<DayCount> attendance,
        long expiringCount,
        List<DueMember> expiring,
        long expiredCount,
        List<DueMember> expired
    ) {}

    /** Écran d'accueil du réceptionniste. */
    public record ReceptionTodayDTO(
        long entriesToday,
        long refusedToday,
        long paymentsToday,
        /** Venus aujourd'hui et à renouveler : le meilleur moment pour proposer le renouvellement. */
        List<MemberLiteDTO> visitedToRenew,
        List<ProspectDTO> prospectsToFollow
    ) {}

    /** Ce que la caisse devrait contenir pour une journée, et la clôture si elle est faite. */
    public record CashDayDTO(
        LocalDate date,
        long expectedCash,
        long expectedMtn,
        long expectedMoov,
        long expectedLink,
        long paymentsCount,
        CashClosure closure
    ) {}

    public record CashClosureRequest(
        @NotNull LocalDate date,
        @NotNull @Min(0) Long countedCash,
        @NotNull @Min(0) Long countedMtn,
        @NotNull @Min(0) Long countedMoov,
        @Size(max = 300) String reason
    ) {}
}
