package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.CheckIn;
import com.mycompany.myapp.domain.Member;
import com.mycompany.myapp.domain.enumeration.CheckInResult;
import com.mycompany.myapp.domain.enumeration.PaymentMethod;
import com.mycompany.myapp.domain.enumeration.PaymentStatus;
import com.mycompany.myapp.domain.enumeration.SubscriptionState;
import com.mycompany.myapp.repository.CheckInRepository;
import com.mycompany.myapp.repository.MemberRepository;
import com.mycompany.myapp.repository.PaymentRepository;
import com.mycompany.myapp.repository.ReminderRepository;
import com.mycompany.myapp.service.dto.DashboardDtos.*;
import com.mycompany.myapp.service.dto.MemberDtos.MemberLiteDTO;
import com.mycompany.myapp.service.dto.ReminderDtos.ReminderStatsDTO;
import com.mycompany.myapp.service.util.Dates;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Chiffres du tableau de bord (gérant) et de l'écran d'accueil (réceptionniste). */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final PaymentRepository paymentRepository;
    private final MemberRepository memberRepository;
    private final CheckInRepository checkInRepository;
    private final ReminderRepository reminderRepository;
    private final ReminderService reminderService;
    private final ProspectService prospectService;
    private final MemberViews views;

    public DashboardService(
        PaymentRepository paymentRepository,
        MemberRepository memberRepository,
        CheckInRepository checkInRepository,
        ReminderRepository reminderRepository,
        ReminderService reminderService,
        ProspectService prospectService,
        MemberViews views
    ) {
        this.paymentRepository = paymentRepository;
        this.memberRepository = memberRepository;
        this.checkInRepository = checkInRepository;
        this.reminderRepository = reminderRepository;
        this.reminderService = reminderService;
        this.prospectService = prospectService;
        this.views = views;
    }

    /** period : DAY (aujourd'hui), WEEK (depuis lundi) ou MONTH (depuis le 1er). */
    public DashboardDTO dashboard(String period) {
        LocalDate today = Dates.today();
        String p = period == null ? "MONTH" : period.toUpperCase();
        LocalDate from =
            switch (p) {
                case "DAY" -> today;
                case "WEEK" -> today.with(DayOfWeek.MONDAY);
                default -> today.withDayOfMonth(1);
            };
        Instant start = Dates.startOf(from);
        Instant end = Dates.endOf(today);

        Map<PaymentMethod, Long> byMethod = new EnumMap<>(PaymentMethod.class);
        for (PaymentMethod m : PaymentMethod.values()) byMethod.put(m, 0L);
        long total = 0;
        long count = 0;
        for (Object[] row : paymentRepository.sumPaidByMethod(start, end)) {
            long amount = ((Number) row[1]).longValue();
            byMethod.put((PaymentMethod) row[0], amount);
            total += amount;
            count += (Long) row[2];
        }

        int threshold = views.threshold();
        Map<Long, Long> reminderCounts = new HashMap<>();
        for (Object[] row : reminderRepository.countByMember()) reminderCounts.put((Long) row[0], (Long) row[1]);

        List<Member> expiring = memberRepository.findEndingBetween(today, today.plusDays(threshold));
        long expiredCount = memberRepository.countByArchivedFalseAndExpiryDateLessThan(today);
        List<Member> expired = memberRepository.findExpired(today, PageRequest.of(0, 5));
        ReminderStatsDTO reminders = reminderService.stats();

        return new DashboardDTO(
            p,
            from,
            total,
            byMethod,
            count,
            paymentRepository.countByStatusAndCancelledAtBetween(PaymentStatus.CANCELLED, start, end),
            memberRepository.countByArchivedFalseAndExpiryDateGreaterThanEqual(today),
            memberRepository.countByArchivedFalseAndJoinDateGreaterThanEqual(from),
            expiredCount,
            reminders.sent(),
            reminders.renewed(),
            attendance(today, 14),
            expiring.size(),
            expiring.stream().limit(5).map(m -> new DueMember(views.lite(m, threshold), reminderCounts.getOrDefault(m.getId(), 0L))).toList(),
            expiredCount,
            expired.stream().map(m -> new DueMember(views.lite(m, threshold), reminderCounts.getOrDefault(m.getId(), 0L))).toList()
        );
    }

    /** Écran d'accueil : activité du jour et personnes à traiter en priorité. */
    public ReceptionTodayDTO receptionToday() {
        LocalDate today = Dates.today();
        int threshold = views.threshold();
        List<CheckIn> checkIns = checkInRepository.findAllByCheckedAtBetweenOrderByCheckedAtDesc(Dates.startOf(today), Dates.endOf(today));
        long refused = checkIns.stream().filter(c -> c.getResult() == CheckInResult.REFUSED).count();

        // Venus aujourd'hui (même refusés) et dont l'abonnement est à renouveler : un par membre.
        Map<Long, MemberLiteDTO> toRenew = new LinkedHashMap<>();
        for (CheckIn c : checkIns) {
            MemberLiteDTO lite = views.lite(c.getMember(), threshold);
            if (lite.state() != SubscriptionState.ACTIVE) toRenew.putIfAbsent(lite.id(), lite);
        }
        long paymentsToday = paymentRepository
            .findAllByCreatedAtBetweenOrderByCreatedAtDesc(Dates.startOf(today), Dates.endOf(today))
            .stream()
            .filter(p -> p.getStatus() == PaymentStatus.PAID)
            .count();

        return new ReceptionTodayDTO(
            checkIns.size() - refused,
            refused,
            paymentsToday,
            new ArrayList<>(toRenew.values()),
            prospectService.list("TODAY").stream().limit(5).toList()
        );
    }

    /** Entrées autorisées par jour, du plus ancien au plus récent (aujourd'hui en dernier). */
    private List<DayCount> attendance(LocalDate today, int days) {
        LocalDate first = today.minusDays(days - 1L);
        Map<LocalDate, Long> perDay = new TreeMap<>();
        for (int i = 0; i < days; i++) perDay.put(first.plusDays(i), 0L);
        for (Instant t : checkInRepository.findAllowedTimesSince(Dates.startOf(first))) {
            perDay.computeIfPresent(Dates.dayOf(t), (d, n) -> n + 1);
        }
        return perDay.entrySet().stream().map(e -> new DayCount(e.getKey(), e.getValue())).toList();
    }
}
