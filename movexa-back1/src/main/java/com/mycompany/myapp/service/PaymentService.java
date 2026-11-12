package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.GymSettings;
import com.mycompany.myapp.domain.Member;
import com.mycompany.myapp.domain.Payment;
import com.mycompany.myapp.domain.Plan;
import com.mycompany.myapp.domain.Subscription;
import com.mycompany.myapp.domain.enumeration.PaymentMethod;
import com.mycompany.myapp.domain.enumeration.PaymentStatus;
import com.mycompany.myapp.repository.MemberRepository;
import com.mycompany.myapp.repository.PaymentRepository;
import com.mycompany.myapp.repository.PlanRepository;
import com.mycompany.myapp.service.dto.PaymentDtos.PaymentDTO;
import com.mycompany.myapp.service.dto.PaymentDtos.PaymentRequest;
import com.mycompany.myapp.service.dto.PaymentDtos.ReceiptDTO;
import com.mycompany.myapp.service.dto.PaymentDtos.WebhookPayload;
import com.mycompany.myapp.service.util.Dates;
import com.mycompany.myapp.web.rest.errors.BadRequestAlertException;
import com.mycompany.myapp.web.rest.errors.NotFoundException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Encaissements (module 3).
 * - Espèces / MoMo / Moov reçus directement : payé tout de suite, abonnement prolongé, reçu numéroté.
 * - Lien de paiement : en attente ; l'abonnement est prolongé quand l'agrégateur confirme (webhook).
 * Rien n'est jamais supprimé : une erreur s'annule avec un motif, et l'annulation est tracée.
 */
@Service
@Transactional
public class PaymentService {

    private static final Logger LOG = LoggerFactory.getLogger(PaymentService.class);
    private static final String ENTITY = "payment";
    /** Statuts de l'agrégateur considérés comme « payé » (à ajuster au format réel de KKiaPay / FedaPay). */
    private static final Set<String> PAID_STATUSES = Set.of("PAID", "SUCCESS", "SUCCESSFUL", "APPROVED", "TRANSFERRED");

    private final PaymentRepository repository;
    private final MemberRepository memberRepository;
    private final PlanRepository planRepository;
    private final SubscriptionService subscriptionService;
    private final SettingsService settingsService;

    public PaymentService(
        PaymentRepository repository,
        MemberRepository memberRepository,
        PlanRepository planRepository,
        SubscriptionService subscriptionService,
        SettingsService settingsService
    ) {
        this.repository = repository;
        this.memberRepository = memberRepository;
        this.planRepository = planRepository;
        this.subscriptionService = subscriptionService;
        this.settingsService = settingsService;
    }

    /** Encaisser une formule pour un membre (renouvellement depuis la fiche, le pointage, la caisse…). */
    public PaymentDTO create(PaymentRequest request) {
        Member member = memberRepository
            .findWithUserById(request.memberId())
            .filter(m -> !m.isArchived())
            .orElseThrow(() -> new NotFoundException("Membre introuvable"));
        Plan plan = planRepository.findById(request.planId()).orElseThrow(() -> new NotFoundException("Formule introuvable"));
        Payment payment = record(member, plan, request.method(), request.amount(), request.startDate(), request.reference());
        return toDto(payment);
    }

    /** Enregistre le paiement ; utilisé aussi par l'inscription d'un nouveau membre. */
    public Payment record(Member member, Plan plan, PaymentMethod method, Long amount, LocalDate startDate, String reference) {
        checkMethodEnabled(method);
        Payment p = new Payment();
        p.setMember(member);
        p.setPlan(plan);
        p.setPlanName(plan.getName());
        p.setAmount(amount != null ? amount : plan.getPrice());
        p.setMethod(method);
        p.setStartDate(startDate);
        p.setReference(StringUtils.hasText(reference) ? reference.trim() : null);
        p.setCreatedBy(MemberViews.currentAgent());

        if (method == PaymentMethod.PAYMENT_LINK) {
            p.setStatus(PaymentStatus.PENDING);
            p.setLinkToken(UUID.randomUUID().toString().replace("-", ""));
        } else {
            markPaid(p);
        }
        return repository.save(p);
    }

    /** Liste d'une journée (par défaut aujourd'hui), annulés compris. */
    @Transactional(readOnly = true)
    public List<PaymentDTO> listDay(LocalDate day) {
        LocalDate d = day != null ? day : Dates.today();
        return repository.findAllByCreatedAtBetweenOrderByCreatedAtDesc(Dates.startOf(d), Dates.endOf(d)).stream().map(this::toDto).toList();
    }

    /** Liens de paiement envoyés ces 60 derniers jours. */
    @Transactional(readOnly = true)
    public List<PaymentDTO> listLinks() {
        Instant since = Dates.startOf(Dates.today().minusDays(60));
        return repository.findAllByMethodAndCreatedAtAfterOrderByCreatedAtDesc(PaymentMethod.PAYMENT_LINK, since).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentDTO> listForMember(Long memberId) {
        return repository.findAllByMemberIdOrderByCreatedAtDesc(memberId).stream().map(this::toDto).toList();
    }

    /** Annulation tracée (réservée au gérant, contrôlé dans PaymentResource). */
    public PaymentDTO cancel(Long id, String reason) {
        Payment p = repository.findWithDetailsById(id).orElseThrow(() -> new NotFoundException("Paiement introuvable"));
        if (p.getStatus() == PaymentStatus.CANCELLED) {
            throw new BadRequestAlertException("Ce paiement est déjà annulé", ENTITY, "alreadycancelled");
        }
        if (p.getStatus() == PaymentStatus.PAID && p.getSubscription() != null) {
            subscriptionService.cancel(p.getSubscription());
        }
        p.setStatus(PaymentStatus.CANCELLED);
        p.setCancelReason(reason.trim());
        p.setCancelledBy(MemberViews.currentAgent());
        p.setCancelledAt(Instant.now());
        LOG.info("Paiement {} annulé par {} : {}", p.getId(), p.getCancelledBy(), reason);
        return toDto(p);
    }

    /** Confirmation manuelle d'un lien payé (si le webhook n'est pas arrivé), réservée au gérant. */
    public PaymentDTO confirmManually(Long id) {
        Payment p = repository.findWithDetailsById(id).orElseThrow(() -> new NotFoundException("Paiement introuvable"));
        if (p.getStatus() != PaymentStatus.PENDING) {
            throw new BadRequestAlertException("Seul un lien en attente peut être confirmé", ENTITY, "notpending");
        }
        markPaid(p);
        p.setReference("Confirmé à la main par " + MemberViews.currentAgent());
        return toDto(p);
    }

    /**
     * Webhook de l'agrégateur. Idempotent : recevoir deux fois la même notification ne prolonge
     * l'abonnement qu'une fois (statut déjà PAID, ou identifiant de transaction déjà connu).
     * La signature est vérifiée avant d'arriver ici (PaymentWebhookResource).
     */
    public void handleWebhook(WebhookPayload payload) {
        if (!PAID_STATUSES.contains(payload.status().toUpperCase())) {
            LOG.info("Webhook ignoré : statut {} pour le lien {}", payload.status(), payload.token());
            return;
        }
        Payment p = repository.findOneByLinkToken(payload.token()).orElseThrow(() -> new NotFoundException("Lien de paiement inconnu"));
        if (p.getStatus() == PaymentStatus.PAID) {
            LOG.info("Webhook déjà traité pour le paiement {}", p.getId());
            return;
        }
        if (p.getStatus() == PaymentStatus.CANCELLED) {
            LOG.warn("Paiement reçu pour un lien annulé ({}) : à rembourser ou réactiver à la main", p.getId());
            return;
        }
        repository
            .findOneByTransactionId(payload.transactionId())
            .ifPresent(other -> {
                throw new BadRequestAlertException("Transaction déjà utilisée", ENTITY, "duplicatetransaction");
            });
        p.setTransactionId(payload.transactionId());
        markPaid(p);
    }

    @Transactional(readOnly = true)
    public ReceiptDTO receipt(Long id) {
        Payment p = repository.findWithDetailsById(id).orElseThrow(() -> new NotFoundException("Paiement introuvable"));
        GymSettings s = settingsService.get();
        Subscription sub = p.getSubscription();
        Member m = p.getMember();
        return new ReceiptDTO(
            p.getId(),
            p.getReceiptNumber(),
            p.getStatus(),
            p.getPaidAt(),
            p.getAmount(),
            p.getMethod(),
            MemberViews.fullName(m),
            m.getMemberNumber(),
            m.getUser().getPhone(),
            p.getPlanName(),
            sub != null ? sub.getStartDate() : null,
            sub != null ? sub.getEndDate() : null,
            p.getMethod() == PaymentMethod.PAYMENT_LINK && p.getTransactionId() != null ? "Paiement en ligne" : p.getCreatedBy(),
            s.getName(),
            s.getAddress(),
            s.getPhone(),
            s.getReceiptFooter(),
            p.getCancelReason()
        );
    }

    public PaymentDTO toDto(Payment p) {
        Member m = p.getMember();
        Subscription sub = p.getSubscription();
        return new PaymentDTO(
            p.getId(),
            m.getId(),
            MemberViews.fullName(m),
            m.getMemberNumber(),
            m.getUser().getPhone(),
            p.getPlan() != null ? p.getPlan().getId() : null,
            p.getPlanName(),
            p.getAmount(),
            p.getMethod(),
            p.getStatus(),
            p.getReceiptNumber(),
            p.getReference(),
            paymentUrl(p),
            p.getCreatedAt(),
            p.getCreatedBy(),
            p.getPaidAt(),
            p.getCancelledAt(),
            p.getCancelledBy(),
            p.getCancelReason(),
            sub != null ? sub.getStartDate() : null,
            sub != null ? sub.getEndDate() : null
        );
    }

    // ---------------------------------------------------------------------------------------------

    private void markPaid(Payment p) {
        Plan plan = p.getPlan();
        if (plan == null) {
            throw new BadRequestAlertException("La formule de ce paiement n'existe plus", ENTITY, "noplan");
        }
        Subscription sub = subscriptionService.addPeriod(p.getMember(), plan, p.getPlanName(), p.getAmount(), p.getStartDate(), p.getCreatedBy());
        p.setSubscription(sub);
        p.setStatus(PaymentStatus.PAID);
        p.setPaidAt(Instant.now());
        p.setReceiptNumber(String.format("R-%05d", repository.nextReceiptNumber()));
    }

    private String paymentUrl(Payment p) {
        if (p.getLinkToken() == null || p.getStatus() != PaymentStatus.PENDING) return null;
        String base = settingsService.get().getPaymentLinkBaseUrl();
        return StringUtils.hasText(base) ? base + p.getLinkToken() : null;
    }

    private void checkMethodEnabled(PaymentMethod method) {
        GymSettings s = settingsService.get();
        boolean enabled =
            switch (method) {
                case CASH -> s.isCashEnabled();
                case MTN_MOMO -> s.isMtnEnabled();
                case MOOV_MONEY -> s.isMoovEnabled();
                case PAYMENT_LINK -> StringUtils.hasText(s.getPaymentLinkBaseUrl());
            };
        if (!enabled) {
            throw new BadRequestAlertException(
                method == PaymentMethod.PAYMENT_LINK
                    ? "Le paiement par lien n'est pas encore configuré (Paramètres > Paiements)"
                    : "Ce moyen de paiement est désactivé dans les paramètres",
                ENTITY,
                "methoddisabled"
            );
        }
    }
}
