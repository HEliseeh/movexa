package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.CheckIn;
import com.mycompany.myapp.domain.Coach;
import com.mycompany.myapp.domain.Member;
import com.mycompany.myapp.domain.Payment;
import com.mycompany.myapp.domain.Plan;
import com.mycompany.myapp.domain.User;
import com.mycompany.myapp.domain.enumeration.CheckInResult;
import com.mycompany.myapp.domain.enumeration.MemberStatus;
import com.mycompany.myapp.domain.enumeration.UserStatus;
import com.mycompany.myapp.repository.CheckInRepository;
import com.mycompany.myapp.repository.MemberRepository;
import com.mycompany.myapp.repository.PlanRepository;
import com.mycompany.myapp.repository.SubscriptionRepository;
import com.mycompany.myapp.repository.UserRepository;
import com.mycompany.myapp.service.dto.MemberDTO;
import com.mycompany.myapp.service.dto.MemberDtos.MemberLiteDTO;
import com.mycompany.myapp.service.dto.MemberDtos.MemberOverviewDTO;
import com.mycompany.myapp.service.dto.MemberDtos.SubscriptionDTO;
import com.mycompany.myapp.service.mapper.MemberMapper;
import com.mycompany.myapp.service.util.Dates;
import com.mycompany.myapp.web.rest.errors.BadRequestAlertException;
import com.mycompany.myapp.web.rest.errors.NotFoundException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Membres (module 1) : la base de référence de la salle.
 * Le téléphone est l'identifiant principal : deux membres ne peuvent pas avoir le même numéro.
 */
@Service
@Transactional
public class MemberService {

    private static final Logger LOG = LoggerFactory.getLogger(MemberService.class);
    private static final String ENTITY_NAME = "member";

    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final MemberMapper memberMapper;
    private final MemberViews views;
    private final PlanRepository planRepository;
    private final PaymentService paymentService;
    private final CheckInRepository checkInRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ReminderService reminderService;
    private final ProspectService prospectService;
    private final CoachService coachService;

    public MemberService(
        MemberRepository memberRepository,
        UserRepository userRepository,
        MemberMapper memberMapper,
        MemberViews views,
        PlanRepository planRepository,
        PaymentService paymentService,
        CheckInRepository checkInRepository,
        SubscriptionRepository subscriptionRepository,
        ReminderService reminderService,
        ProspectService prospectService,
        CoachService coachService
    ) {
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.memberMapper = memberMapper;
        this.views = views;
        this.planRepository = planRepository;
        this.paymentService = paymentService;
        this.checkInRepository = checkInRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.reminderService = reminderService;
        this.prospectService = prospectService;
        this.coachService = coachService;
    }

    /** Liste paginée des membres non archivés, avec statut et nombre de visites sur 30 jours. */
    @Transactional(readOnly = true)
    public Page<MemberDTO> findAll(Pageable pageable) {
        int threshold = views.threshold();
        Map<Long, Long> visits = visitsLast30Days();
        return memberRepository
            .findAllByArchivedFalse(pageable)
            .map(m -> {
                MemberDTO dto = views.enrich(memberMapper.toDto(m), threshold);
                dto.setVisitsLast30Days(visits.getOrDefault(m.getId(), 0L).intValue());
                return dto;
            });
    }

    @Transactional(readOnly = true)
    public Optional<MemberDTO> findOne(Long id) {
        return memberRepository.findWithUserById(id).map(m -> views.enrich(memberMapper.toDto(m), views.threshold()));
    }

    /** Recherche instantanée par nom, numéro de membre ou téléphone. */
    @Transactional(readOnly = true)
    public List<MemberLiteDTO> search(String query, int limit) {
        String q = query == null ? "" : query.trim();
        if (q.isEmpty()) return List.of();
        String digits = Dates.digits(q);
        int threshold = views.threshold();
        return memberRepository
            .search(q, digits.length() >= 2 ? digits : "", PageRequest.of(0, Math.min(limit, 50)))
            .stream()
            .map(m -> views.lite(m, threshold))
            .toList();
    }

    /** Membre correspondant au contenu d'un QR code. */
    @Transactional(readOnly = true)
    public Optional<MemberLiteDTO> findByQr(String token) {
        return memberRepository.findOneWithUserByQrTokenAndArchivedFalse(token).map(m -> views.lite(m, views.threshold()));
    }

    /** Tous les membres en version légère : cache du pointage hors ligne. */
    @Transactional(readOnly = true)
    public List<MemberLiteDTO> findAllLite() {
        int threshold = views.threshold();
        return memberRepository.findAllByArchivedFalse(Pageable.unpaged()).stream().map(m -> views.lite(m, threshold)).toList();
    }

    /** Fiche membre : abonnements, paiements, visites des 30 derniers jours et relances. */
    @Transactional(readOnly = true)
    public Optional<MemberOverviewDTO> overview(Long id) {
        return memberRepository
            .findWithUserById(id)
            .map(m -> {
                MemberDTO dto = views.enrich(memberMapper.toDto(m), views.threshold());
                Instant since = Dates.startOf(Dates.today().minusDays(29));
                List<CheckIn> checkIns = checkInRepository.findAllByMemberIdAndCheckedAtAfterOrderByCheckedAtDesc(id, since);
                List<LocalDate> days = checkIns
                    .stream()
                    .filter(c -> c.getResult() != CheckInResult.REFUSED)
                    .map(c -> Dates.dayOf(c.getCheckedAt()))
                    .distinct()
                    .toList();
                dto.setVisitsLast30Days(days.size());
                List<SubscriptionDTO> subs = subscriptionRepository
                    .findAllByMemberIdOrderByStartDateDesc(id)
                    .stream()
                    .map(s -> new SubscriptionDTO(s.getId(), s.getPlanName(), s.getPrice(), s.getStartDate(), s.getEndDate(), s.isCancelled(), s.getCreatedAt()))
                    .toList();
                return new MemberOverviewDTO(dto, subs, paymentService.listForMember(id), days, reminderService.forMember(id));
            });
    }

    /**
     * Inscription : crée le user ET le membre, puis, si une formule est choisie, encaisse
     * (ou envoie le lien) dans la même transaction. Si le paiement échoue, rien n'est enregistré.
     */
    public MemberDTO create(MemberDTO dto) {
        LOG.debug("Création d'un membre : {} {}", dto.getFirstName(), dto.getLastName());
        clean(dto);
        checkEmailAvailable(dto.getEmail(), null);
        checkPhoneAvailable(dto.getPhone(), null);

        Plan plan = null;
        if (dto.getPlanId() != null) {
            plan = planRepository.findById(dto.getPlanId()).orElseThrow(() -> new NotFoundException("Formule introuvable"));
            if (dto.getPaymentMethod() == null) {
                throw new BadRequestAlertException("Choisissez le moyen de paiement", ENTITY_NAME, "paymentmethodrequired");
            }
        }

        User user = new User();
        user.setStatus(UserStatus.CLIENT);
        Member member = new Member();
        member.setUser(user);
        member.setStatus(MemberStatus.ACTIVE);
        memberMapper.update(member, dto);
        applyCoach(member, dto.getCoachId());
        applyDerivedFields(member);

        member = memberRepository.saveAndFlush(member);
        // L'id n'existe qu'après l'insertion : le numéro est écrit au commit (entité « managed »).
        member.setMemberNumber(String.format("A-%04d", member.getId()));

        Payment payment = null;
        if (plan != null) {
            LocalDate start = dto.getPlanStartDate() != null ? dto.getPlanStartDate() : Dates.today();
            payment = paymentService.record(member, plan, dto.getPaymentMethod(), null, start, null);
        }
        if (dto.getProspectId() != null) {
            prospectService.markConverted(dto.getProspectId(), member.getId());
        }

        MemberDTO result = views.enrich(memberMapper.toDto(member), views.threshold());
        if (payment != null) result.setPayment(paymentService.toDto(payment));
        return result;
    }

    public Optional<MemberDTO> update(Long id, MemberDTO dto) {
        clean(dto);
        return memberRepository
            .findWithUserById(id)
            .filter(m -> !m.isArchived())
            .map(member -> {
                checkEmailAvailable(dto.getEmail(), member.getUser().getId());
                checkPhoneAvailable(dto.getPhone(), member.getId());
                memberMapper.update(member, dto);
                applyCoach(member, dto.getCoachId());
                applyDerivedFields(member);
                return views.enrich(memberMapper.toDto(member), views.threshold());
            });
    }

    /**
     * « Supprimer » un membre l'archive : il disparaît des listes et ne peut plus pointer,
     * mais ses paiements et passages restent (aucune suppression silencieuse).
     */
    public boolean archive(Long id) {
        Optional<Member> member = memberRepository.findById(id);
        member.ifPresent(m -> m.setArchived(true));
        return member.isPresent();
    }

    // ---------------------------------------------------------------------------------------------

    /** Nombre d'entrées autorisées par membre sur les 30 derniers jours (une seule requête). */
    private Map<Long, Long> visitsLast30Days() {
        Map<Long, Long> result = new HashMap<>();
        for (Object[] row : checkInRepository.countAllowedByMemberSince(Dates.startOf(Dates.today().minusDays(29)))) {
            result.put((Long) row[0], (Long) row[1]);
        }
        return result;
    }

    /** Coach choisi dans la fiche : on garde le lien et on recopie son nom pour l'affichage */
    private void applyCoach(Member member, Long coachId) {
        if (coachId == null) {
            member.setCoachId(null);
            member.setCoach(null);
        } else if (!coachId.equals(member.getCoachId()) || member.getCoach() == null) {
            Coach coach = coachService.require(coachId);
            member.setCoachId(coach.getId());
            member.setCoach(coach.getFullName());
        }
    }

    /** Un champ texte vide envoyé par le formulaire devient null (sinon "" violerait l'unicité de l'e-mail). */
    private void clean(MemberDTO dto) {
        dto.setFirstName(trimToNull(dto.getFirstName()));
        dto.setLastName(trimToNull(dto.getLastName()));
        dto.setEmail(dto.getEmail() == null ? null : trimToNull(dto.getEmail().toLowerCase()));
        dto.setPhone(trimToNull(dto.getPhone()));
        dto.setCoach(trimToNull(dto.getCoach()));
        dto.setProgram(trimToNull(dto.getProgram()));
        dto.setNotes(trimToNull(dto.getNotes()));
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    /** Refuse un e-mail déjà utilisé par une autre personne. */
    private void checkEmailAvailable(String email, Long currentUserId) {
        if (email == null) return;
        userRepository
            .findOneByEmailIgnoreCase(email)
            .filter(existing -> !existing.getId().equals(currentUserId))
            .ifPresent(existing -> {
                throw new BadRequestAlertException("Cette adresse e-mail est déjà utilisée", ENTITY_NAME, "emailexists");
            });
    }

    /** Détection des doublons par numéro (les 8 derniers chiffres, avec ou sans indicatif). */
    private void checkPhoneAvailable(String phone, Long currentMemberId) {
        String key = Dates.phoneKey(phone);
        if (key.length() < 8) return;
        memberRepository
            .findByPhoneSuffix(key)
            .stream()
            .filter(existing -> !existing.getId().equals(currentMemberId))
            .findFirst()
            .ifPresent(existing -> {
                throw new BadRequestAlertException(
                    "Ce numéro appartient déjà à " + MemberViews.fullName(existing) + " (" + existing.getMemberNumber() + ")",
                    ENTITY_NAME,
                    "phoneexists"
                );
            });
    }

    /** Champs calculés : âge (depuis la date de naissance) et chiffres du téléphone. */
    private void applyDerivedFields(Member member) {
        User user = member.getUser();
        user.setAge(user.getBirthDate() == null ? null : Period.between(user.getBirthDate(), LocalDate.now()).getYears());
        user.setPhoneDigits(user.getPhone() == null ? null : Dates.digits(user.getPhone()));
    }
}
