package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.Member;
import com.mycompany.myapp.domain.Plan;
import com.mycompany.myapp.domain.Subscription;
import com.mycompany.myapp.repository.SubscriptionRepository;
import com.mycompany.myapp.service.util.Dates;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Règles des périodes d'abonnement (module 2).
 * Le membre garde une copie de sa période en cours (plan, début, fin) pour que les listes
 * restent rapides ; cette copie est toujours recalculée ici, jamais saisie à la main.
 */
@Service
@Transactional
public class SubscriptionService {

    private final SubscriptionRepository repository;

    public SubscriptionService(SubscriptionRepository repository) {
        this.repository = repository;
    }

    /**
     * Début d'une nouvelle période, si aucune date n'est imposée :
     * à partir de la fin actuelle si l'abonnement est encore actif, sinon à partir d'aujourd'hui.
     */
    public LocalDate defaultStart(Member member) {
        LocalDate today = Dates.today();
        LocalDate end = member.getExpiryDate();
        return end != null && !end.isBefore(today) ? end : today;
    }

    /** Ajoute une période payée (inscription ou renouvellement) et met le membre à jour. */
    public Subscription addPeriod(Member member, Plan plan, String planName, long price, LocalDate requestedStart, String createdBy) {
        LocalDate start = requestedStart != null ? requestedStart : defaultStart(member);
        LocalDate end = start.plusDays(plan.getDurationDays());
        return save(member, plan, planName, price, start, end, createdBy);
    }

    /** Période reprise d'un ancien fichier (import) : pas de paiement associé. */
    public Subscription addImported(Member member, Plan plan, LocalDate end, String createdBy) {
        LocalDate start = end.minusDays(plan.getDurationDays());
        return save(member, plan, plan.getName(), 0L, start, end, createdBy);
    }

    /** Annulation du paiement : la période ne compte plus, la date de fin du membre est recalculée. */
    public void cancel(Subscription subscription) {
        subscription.setCancelled(true);
        repository.saveAndFlush(subscription);
        syncMember(subscription.getMember());
    }

    /** Recopie dans le membre la période valide qui finit le plus tard. */
    public void syncMember(Member member) {
        repository
            .findFirstByMemberIdAndCancelledFalseOrderByEndDateDesc(member.getId())
            .ifPresentOrElse(
                s -> {
                    member.setPlan(s.getPlanName());
                    member.setSubscriptionStartDate(s.getStartDate());
                    member.setExpiryDate(s.getEndDate());
                },
                () -> {
                    member.setPlan(null);
                    member.setExpiryDate(null);
                }
            );
    }

    private Subscription save(Member member, Plan plan, String planName, long price, LocalDate start, LocalDate end, String createdBy) {
        Subscription s = new Subscription();
        s.setMember(member);
        s.setPlan(plan);
        s.setPlanName(planName);
        s.setPrice(price);
        s.setStartDate(start);
        s.setEndDate(end);
        s.setCreatedBy(createdBy);
        repository.saveAndFlush(s);
        syncMember(member);
        return s;
    }
}
