package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.GymSettings;
import com.mycompany.myapp.domain.Member;
import com.mycompany.myapp.domain.Payment;
import com.mycompany.myapp.domain.Plan;
import com.mycompany.myapp.domain.Reminder;
import com.mycompany.myapp.domain.enumeration.PaymentMethod;
import com.mycompany.myapp.domain.enumeration.ReminderChannel;
import com.mycompany.myapp.domain.enumeration.ReminderRule;
import com.mycompany.myapp.domain.enumeration.SubscriptionState;
import com.mycompany.myapp.repository.MemberRepository;
import com.mycompany.myapp.repository.PaymentRepository;
import com.mycompany.myapp.repository.PlanRepository;
import com.mycompany.myapp.repository.ReminderRepository;
import com.mycompany.myapp.service.dto.ReminderDtos.ReminderDTO;
import com.mycompany.myapp.service.dto.ReminderDtos.ReminderQueueItem;
import com.mycompany.myapp.service.dto.ReminderDtos.ReminderSendRequest;
import com.mycompany.myapp.service.dto.ReminderDtos.ReminderStatsDTO;
import com.mycompany.myapp.service.util.Dates;
import com.mycompany.myapp.web.rest.errors.NotFoundException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Relances des membres (module 5).
 * Pas de fournisseur SMS ni d'API WhatsApp dans le MVP : le serveur prépare la liste du jour et
 * le message ; l'accueil ouvre le lien wa.me ou SMS pré-rempli, puis l'envoi est enregistré ici.
 * Le résultat d'une relance se déduit des paiements : un paiement après la relance = renouvelé.
 */
@Service
@Transactional
public class ReminderService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM");
    private static final Map<PaymentMethod, String> METHOD_LABELS = Map.of(
        PaymentMethod.CASH,
        "en espèces",
        PaymentMethod.MTN_MOMO,
        "par MTN MoMo",
        PaymentMethod.MOOV_MONEY,
        "par Moov Money",
        PaymentMethod.PAYMENT_LINK,
        "par lien de paiement"
    );

    private final ReminderRepository repository;
    private final MemberRepository memberRepository;
    private final PaymentRepository paymentRepository;
    private final PlanRepository planRepository;
    private final SettingsService settingsService;

    public ReminderService(
        ReminderRepository repository,
        MemberRepository memberRepository,
        PaymentRepository paymentRepository,
        PlanRepository planRepository,
        SettingsService settingsService
    ) {
        this.repository = repository;
        this.memberRepository = memberRepository;
        this.paymentRepository = paymentRepository;
        this.planRepository = planRepository;
        this.settingsService = settingsService;
    }

    /**
     * Relances à faire aujourd'hui. Chaque règle couvre une fenêtre de dates de fin, pour qu'une
     * journée sans connexion ne fasse pas « sauter » une relance :
     * J-7 : fin dans 2 à 7 jours ; J-1 : fin aujourd'hui ou demain ;
     * J+1 : expiré depuis 1 à 6 jours ; J+7 : expiré depuis 7 à 30 jours.
     */
    @Transactional(readOnly = true)
    public List<ReminderQueueItem> queue() {
        GymSettings s = settingsService.get();
        LocalDate today = Dates.today();
        Set<String> done = new HashSet<>();
        for (Object[] row : repository.findSentKeysSince(today.minusDays(60))) {
            done.add(key((Long) row[0], (ReminderRule) row[1], (LocalDate) row[2]));
        }
        Map<String, Long> prices = planPrices();

        List<ReminderQueueItem> items = new ArrayList<>();
        addRule(items, done, prices, s, ReminderRule.BEFORE_7, today.plusDays(2), today.plusDays(7), s.isReminderBefore7Sms(), s.isReminderBefore7Whatsapp());
        addRule(items, done, prices, s, ReminderRule.BEFORE_1, today, today.plusDays(1), s.isReminderBefore1Sms(), s.isReminderBefore1Whatsapp());
        addRule(items, done, prices, s, ReminderRule.AFTER_1, today.minusDays(6), today.minusDays(1), s.isReminderAfter1Sms(), s.isReminderAfter1Whatsapp());
        addRule(items, done, prices, s, ReminderRule.AFTER_7, today.minusDays(30), today.minusDays(7), s.isReminderAfter7Sms(), s.isReminderAfter7Whatsapp());
        items.sort(Comparator.comparing(ReminderQueueItem::targetEndDate));
        return items;
    }

    /**
     * Relance manuelle des membres cochés dans la liste : même message que la relance automatique,
     * la règle étant déduite de la date de fin. Sont écartés (même règle que l'écran Membres) :
     * les archivés, les membres sans téléphone, sans abonnement ou dont l'abonnement est encore actif.
     */
    @Transactional(readOnly = true)
    public List<ReminderQueueItem> compose(List<Long> memberIds) {
        GymSettings s = settingsService.get();
        LocalDate today = Dates.today();
        Map<String, Long> prices = planPrices();
        boolean anyWhatsapp =
            s.isReminderBefore7Whatsapp() || s.isReminderBefore1Whatsapp() || s.isReminderAfter1Whatsapp() || s.isReminderAfter7Whatsapp();
        boolean anySms = s.isReminderBefore7Sms() || s.isReminderBefore1Sms() || s.isReminderAfter1Sms() || s.isReminderAfter7Sms();
        ReminderChannel channel = anyWhatsapp || !anySms ? ReminderChannel.WHATSAPP : ReminderChannel.SMS;

        List<ReminderQueueItem> items = new ArrayList<>();
        for (Member m : memberRepository.findAllWithUserByIdIn(memberIds)) {
            if (!isRemindable(m)) continue;
            long days = ChronoUnit.DAYS.between(today, m.getExpiryDate());
            ReminderRule rule = days > 1
                ? ReminderRule.BEFORE_7
                : days >= 0 ? ReminderRule.BEFORE_1 : days > -7 ? ReminderRule.AFTER_1 : ReminderRule.AFTER_7;
            boolean expired = days < 0;
            Long amount = m.getPlan() != null ? prices.get(m.getPlan()) : null;
            items.add(
                new ReminderQueueItem(
                    m.getId(),
                    MemberViews.fullName(m),
                    m.getUser().getPhone(),
                    rule,
                    channel,
                    m.getExpiryDate(),
                    m.getPlan(),
                    amount,
                    expired,
                    message(m, s, amount, expired)
                )
            );
        }
        items.sort(Comparator.comparing(ReminderQueueItem::targetEndDate));
        return items;
    }

    /** Un membre peut être relancé : actif dans la base, joignable, et en fin ou après la fin d'abonnement. */
    private boolean isRemindable(Member m) {
        if (m.isArchived() || m.getExpiryDate() == null || m.getUser() == null) return false;
        String phone = m.getUser().getPhone();
        if (phone == null || phone.replaceAll("\\D", "").length() < 8) return false;
        SubscriptionState state = settingsService.stateOf(m.getExpiryDate());
        return state == SubscriptionState.EXPIRING_SOON || state == SubscriptionState.EXPIRED;
    }

    /** Enregistre une relance envoyée (le message est parti par WhatsApp ou SMS depuis le téléphone). */
    public ReminderDTO send(ReminderSendRequest request) {
        Member member = memberRepository.findWithUserById(request.memberId()).orElseThrow(() -> new NotFoundException("Membre introuvable"));
        Reminder r = new Reminder();
        r.setMember(member);
        r.setRule(request.rule());
        r.setChannel(request.channel());
        r.setTargetEndDate(request.targetEndDate() != null ? request.targetEndDate() : member.getExpiryDate());
        r.setMessage(request.message());
        r.setSentBy(MemberViews.currentAgent());
        repository.save(r);
        return withOutcomes(List.of(r)).get(0);
    }

    /** Relances envoyées sur les N derniers jours, avec leur résultat. */
    @Transactional(readOnly = true)
    public List<ReminderDTO> history(int days) {
        return withOutcomes(repository.findAllBySentAtAfterOrderBySentAtDesc(Dates.startOf(Dates.today().minusDays(days))));
    }

    @Transactional(readOnly = true)
    public List<ReminderDTO> forMember(Long memberId) {
        return withOutcomes(repository.findAllByMemberIdOrderBySentAtDesc(memberId));
    }

    /** Chiffres de la semaine (7 derniers jours) : ce que les relances ont rapporté. */
    @Transactional(readOnly = true)
    public ReminderStatsDTO stats() {
        List<Reminder> week = repository.findAllBySentAtAfterOrderBySentAtDesc(Dates.startOf(Dates.today().minusDays(6)));
        long sms = week.stream().filter(r -> r.getChannel() == ReminderChannel.SMS).count();
        Map<Long, Payment> firstPaymentByReminder = firstPaymentAfter(week);
        // Un même paiement peut suivre plusieurs relances : on ne le compte qu'une fois.
        Set<Long> countedPayments = new HashSet<>();
        long amount = 0;
        for (Payment p : firstPaymentByReminder.values()) {
            if (countedPayments.add(p.getId())) amount += p.getAmount();
        }
        long renewedMembers = week
            .stream()
            .filter(r -> firstPaymentByReminder.containsKey(r.getId()))
            .map(r -> r.getMember().getId())
            .distinct()
            .count();
        return new ReminderStatsDTO(week.size(), sms, week.size() - sms, renewedMembers, amount, queue().size());
    }

    // ---------------------------------------------------------------------------------------------

    private void addRule(
        List<ReminderQueueItem> items,
        Set<String> done,
        Map<String, Long> prices,
        GymSettings s,
        ReminderRule rule,
        LocalDate from,
        LocalDate to,
        boolean sms,
        boolean whatsapp
    ) {
        if (!sms && !whatsapp) return;
        ReminderChannel channel = whatsapp ? ReminderChannel.WHATSAPP : ReminderChannel.SMS;
        boolean expired = rule == ReminderRule.AFTER_1 || rule == ReminderRule.AFTER_7;
        for (Member m : memberRepository.findEndingBetween(from, to)) {
            if (done.contains(key(m.getId(), rule, m.getExpiryDate()))) continue;
            Long amount = m.getPlan() != null ? prices.get(m.getPlan()) : null;
            items.add(
                new ReminderQueueItem(
                    m.getId(),
                    MemberViews.fullName(m),
                    m.getUser().getPhone(),
                    rule,
                    channel,
                    m.getExpiryDate(),
                    m.getPlan(),
                    amount,
                    expired,
                    message(m, s, amount, expired)
                )
            );
        }
    }

    /** Message prêt à envoyer. Le lien de paiement en ligne sera ajouté quand l'agrégateur sera branché. */
    private String message(Member m, GymSettings s, Long amount, boolean expired) {
        String salle = StringUtils.hasText(s.getName()) ? s.getName() : "la salle";
        String plan = m.getPlan() != null ? " " + m.getPlan() : "";
        LocalDate end = m.getExpiryDate();
        LocalDate today = Dates.today();
        StringBuilder msg = new StringBuilder("Bonjour ").append(m.getUser().getFirstName()).append(", ");
        if (expired) {
            msg.append("votre abonnement").append(plan).append(" à ").append(salle).append(" a pris fin le ").append(end.format(DAY)).append(".");
        } else {
            String when = end.equals(today) ? "aujourd'hui" : end.equals(today.plusDays(1)) ? "demain" : "le " + end.format(DAY);
            msg.append("votre abonnement").append(plan).append(" à ").append(salle).append(" se termine ").append(when).append(".");
        }
        if (amount != null) {
            msg.append("\nRenouvellement : ").append(String.format(Locale.FRANCE, "%,d", amount).replace(' ', ' ').replace(' ', ' ')).append(" FCFA");
            if (StringUtils.hasText(s.getMomoNumber())) msg.append(", par MTN MoMo au ").append(s.getMomoNumber()).append(" ou à l'accueil");
            msg.append(".");
        }
        msg.append(expired ? "\nÀ bientôt à la salle !" : "\nÀ bientôt !");
        return msg.toString();
    }

    private Map<String, Long> planPrices() {
        Map<String, Long> prices = new HashMap<>();
        for (Plan p : planRepository.findAll()) prices.put(p.getName(), p.getPrice());
        return prices;
    }

    private static String key(Long memberId, ReminderRule rule, LocalDate end) {
        return memberId + "|" + rule + "|" + end;
    }

    /** Premier paiement encaissé après chaque relance (s'il existe). */
    private Map<Long, Payment> firstPaymentAfter(List<Reminder> reminders) {
        Map<Long, Payment> result = new HashMap<>();
        if (reminders.isEmpty()) return result;
        Instant since = reminders.stream().map(Reminder::getSentAt).min(Comparator.naturalOrder()).orElseThrow();
        List<Long> memberIds = reminders.stream().map(r -> r.getMember().getId()).distinct().toList();
        List<Payment> payments = paymentRepository.findPaidForMembersSince(memberIds, since);
        for (Reminder r : reminders) {
            payments
                .stream()
                .filter(p -> p.getMember().getId().equals(r.getMember().getId()) && p.getPaidAt().isAfter(r.getSentAt()))
                .findFirst()
                .ifPresent(p -> result.put(r.getId(), p));
        }
        return result;
    }

    private List<ReminderDTO> withOutcomes(List<Reminder> reminders) {
        Map<Long, Payment> paid = firstPaymentAfter(reminders);
        LocalDate today = Dates.today();
        return reminders
            .stream()
            .map(r -> {
                Payment p = paid.get(r.getId());
                String outcome;
                String text;
                if (p != null) {
                    outcome = "RENEWED";
                    text = "Renouvelé le " + Dates.dayOf(p.getPaidAt()).format(DAY) + " " + METHOD_LABELS.get(p.getMethod());
                } else if (r.getTargetEndDate() != null && !r.getTargetEndDate().isBefore(today)) {
                    outcome = "WAITING";
                    text = "En attente";
                } else {
                    outcome = "NO_RESPONSE";
                    text = "Pas de réponse";
                }
                return new ReminderDTO(
                    r.getId(),
                    r.getMember().getId(),
                    MemberViews.fullName(r.getMember()),
                    r.getRule(),
                    r.getChannel(),
                    r.getTargetEndDate(),
                    r.getSentAt(),
                    r.getSentBy(),
                    outcome,
                    text
                );
            })
            .toList();
    }
}
