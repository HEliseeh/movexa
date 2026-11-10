package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.Member;
import com.mycompany.myapp.domain.User;
import com.mycompany.myapp.domain.enumeration.MemberStatus;
import com.mycompany.myapp.domain.enumeration.UserStatus;
import com.mycompany.myapp.repository.MemberRepository;
import com.mycompany.myapp.repository.UserRepository;
import com.mycompany.myapp.service.dto.MemberDTO;
import com.mycompany.myapp.service.mapper.MemberMapper;
import com.mycompany.myapp.web.rest.errors.BadRequestAlertException;
import java.time.LocalDate;
import java.time.Period;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional
public class MemberService {

    private static final Logger LOG = LoggerFactory.getLogger(MemberService.class);
    private static final String ENTITY_NAME = "member";

    /**
     * Durée de chaque formule, en mois. Provisoire : ira dans une entité Plan
     * (avec le prix) quand le module Abonnements sera créé.
     */
    private static final Map<String, Integer> PLAN_DURATION_MONTHS = Map.of(
        "Mensuel Essentiel", 1,
        "Mensuel Illimité", 1,
        "Trimestriel", 3,
        "Annuel", 12
    );

    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final MemberMapper memberMapper;

    public MemberService(MemberRepository memberRepository, UserRepository userRepository, MemberMapper memberMapper) {
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.memberMapper = memberMapper;
    }

    /** Liste paginée, éventuellement filtrée par statut. */
    @Transactional(readOnly = true)
    public Page<MemberDTO> findAll(MemberStatus status, Pageable pageable) {
        Page<Member> page = status == null
            ? memberRepository.findAll(pageable)
            : memberRepository.findAllByStatus(status, pageable);
        return page.map(memberMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<MemberDTO> findOne(Long id) {
        return memberRepository.findWithUserById(id).map(memberMapper::toDto);
    }

    /** Crée le user ET le membre (cascade PERSIST sur la relation). */
    public MemberDTO create(MemberDTO dto) {
        LOG.debug("Création d'un membre : {} {}", dto.getFirstName(), dto.getLastName());
        clean(dto);
        checkEmailAvailable(dto.getEmail(), null);

        User user = new User();
        user.setStatus(UserStatus.CLIENT);
        Member member = new Member();
        member.setUser(user);
        member.setStatus(MemberStatus.ACTIVE);
        memberMapper.update(member, dto);
        applyDerivedFields(member, true);

        member = memberRepository.save(member);
        // L'id n'existe qu'après l'insertion : le numéro est écrit au commit (entité « managed »).
        member.setMemberNumber(String.format("A-%04d", member.getId()));
        return memberMapper.toDto(member);
    }

    public Optional<MemberDTO> update(Long id, MemberDTO dto) {
        clean(dto);
        return memberRepository
            .findWithUserById(id)
            .map(member -> {
                checkEmailAvailable(dto.getEmail(), member.getUser().getId());
                String oldPlan = member.getPlan();
                LocalDate oldStart = member.getSubscriptionStartDate();

                memberMapper.update(member, dto);

                // L'échéance n'est recalculée que si la formule ou la date de début a changé
                boolean periodChanged =
                    !Objects.equals(oldPlan, member.getPlan()) || !Objects.equals(oldStart, member.getSubscriptionStartDate());
                applyDerivedFields(member, periodChanged);
                return memberMapper.toDto(member);
            });
    }

    /** Supprime le membre et son user (la personne n'existe dans ce service que via son adhésion). */
    public boolean delete(Long id) {
        Optional<Member> member = memberRepository.findWithUserById(id);
        member.ifPresent(m -> {
            memberRepository.delete(m);
            userRepository.delete(m.getUser());
        });
        return member.isPresent();
    }

    // ---------------------------------------------------------------------------------------------

    /** Un champ texte vide envoyé par le formulaire devient null (sinon "" violerait l'unicité de l'e-mail). */
    private void clean(MemberDTO dto) {
        dto.setFirstName(trimToNull(dto.getFirstName()));
        dto.setLastName(trimToNull(dto.getLastName()));
        dto.setEmail(dto.getEmail() == null ? null : trimToNull(dto.getEmail().toLowerCase()));
        dto.setPhone(trimToNull(dto.getPhone()));
        dto.setPlan(trimToNull(dto.getPlan()));
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

    /** Champs calculés : âge (depuis la date de naissance) et échéance (début + durée de la formule). */
    private void applyDerivedFields(Member member, boolean recomputeExpiry) {
        User user = member.getUser();
        user.setAge(user.getBirthDate() == null ? null : Period.between(user.getBirthDate(), LocalDate.now()).getYears());

        Integer months = PLAN_DURATION_MONTHS.get(member.getPlan());
        if (recomputeExpiry && months != null && member.getSubscriptionStartDate() != null) {
            member.setExpiryDate(member.getSubscriptionStartDate().plusMonths(months));
        }
    }
}
