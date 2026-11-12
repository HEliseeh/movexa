package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.CheckIn;
import com.mycompany.myapp.domain.Member;
import com.mycompany.myapp.domain.enumeration.CheckInResult;
import com.mycompany.myapp.domain.enumeration.SubscriptionState;
import com.mycompany.myapp.repository.CheckInRepository;
import com.mycompany.myapp.repository.MemberRepository;
import com.mycompany.myapp.service.dto.CheckInDtos.CheckInDTO;
import com.mycompany.myapp.service.dto.CheckInDtos.CheckInRequest;
import com.mycompany.myapp.service.util.Dates;
import com.mycompany.myapp.web.rest.errors.BadRequestAlertException;
import com.mycompany.myapp.web.rest.errors.NotFoundException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Pointage à l'entrée (module 4) : vérifie l'abonnement et enregistre le passage.
 * Vert = valide, orange = expire bientôt (entrée acceptée, proposer le renouvellement), rouge = refusé.
 */
@Service
@Transactional
public class CheckInService {

    private final CheckInRepository repository;
    private final MemberRepository memberRepository;
    private final SettingsService settingsService;
    private final MemberViews views;

    public CheckInService(
        CheckInRepository repository,
        MemberRepository memberRepository,
        SettingsService settingsService,
        MemberViews views
    ) {
        this.repository = repository;
        this.memberRepository = memberRepository;
        this.settingsService = settingsService;
        this.views = views;
    }

    public CheckInDTO checkIn(CheckInRequest request) {
        // Pointage hors ligne renvoyé une seconde fois : on rend le premier, sans doublon.
        if (StringUtils.hasText(request.clientId())) {
            var existing = repository.findOneByClientId(request.clientId());
            if (existing.isPresent()) return toDto(existing.get(), views.threshold());
        }

        Member member;
        if (request.memberId() != null) {
            member = memberRepository.findWithUserById(request.memberId()).orElseThrow(() -> new NotFoundException("Membre introuvable"));
        } else if (StringUtils.hasText(request.qrToken())) {
            member = memberRepository
                .findOneWithUserByQrTokenAndArchivedFalse(request.qrToken().trim())
                .orElseThrow(() -> new NotFoundException("QR code inconnu : ce n'est pas une carte de membre de la salle"));
        } else {
            throw new BadRequestAlertException("Indiquez le membre ou le QR code", "checkin", "nomember");
        }
        if (member.isArchived()) {
            throw new BadRequestAlertException("Ce membre est archivé", "checkin", "archived");
        }

        // Heure réelle du passage (hors ligne), sans accepter une date dans le futur.
        Instant now = Instant.now();
        Instant at = request.checkedAt() != null && request.checkedAt().isBefore(now.plus(Duration.ofMinutes(5))) ? request.checkedAt() : now;
        LocalDate day = Dates.dayOf(at);
        int threshold = views.threshold();
        SubscriptionState state = settingsService.stateOn(member.getExpiryDate(), day, threshold);

        CheckIn c = new CheckIn();
        c.setMember(member);
        c.setCheckedAt(at);
        c.setMethod(request.method());
        c.setResult(
            switch (state) {
                case ACTIVE -> CheckInResult.ALLOWED;
                case EXPIRING_SOON -> CheckInResult.ALLOWED_EXPIRING;
                case EXPIRED, NONE -> CheckInResult.REFUSED;
            }
        );
        c.setAgent(MemberViews.currentAgent());
        c.setClientId(StringUtils.hasText(request.clientId()) ? request.clientId() : null);
        repository.save(c);

        if (c.getResult() != CheckInResult.REFUSED && (member.getLastVisitDate() == null || member.getLastVisitDate().isBefore(day))) {
            member.setLastVisitDate(day);
        }
        return toDto(c, threshold);
    }

    /** Passages du jour, du plus récent au plus ancien. */
    @Transactional(readOnly = true)
    public List<CheckInDTO> today() {
        LocalDate today = Dates.today();
        int threshold = views.threshold();
        return repository
            .findAllByCheckedAtBetweenOrderByCheckedAtDesc(Dates.startOf(today), Dates.endOf(today))
            .stream()
            .map(c -> toDto(c, threshold))
            .toList();
    }

    private CheckInDTO toDto(CheckIn c, int threshold) {
        Member m = c.getMember();
        return new CheckInDTO(
            c.getId(),
            m.getId(),
            MemberViews.fullName(m),
            m.getMemberNumber(),
            m.getUser().getPhone(),
            c.getMethod(),
            c.getResult(),
            c.getCheckedAt(),
            c.getAgent(),
            settingsService.stateOf(m.getExpiryDate(), threshold),
            m.getPlan(),
            m.getExpiryDate(),
            MemberViews.daysLeft(m.getExpiryDate())
        );
    }
}
