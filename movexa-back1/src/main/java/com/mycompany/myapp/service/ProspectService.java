package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.GymSettings;
import com.mycompany.myapp.domain.JobRun;
import com.mycompany.myapp.domain.Prospect;
import com.mycompany.myapp.domain.ProspectEvent;
import com.mycompany.myapp.domain.ProspectOutcome;
import com.mycompany.myapp.domain.enumeration.ProspectOutcomeType;
import com.mycompany.myapp.domain.enumeration.ProspectSource;
import com.mycompany.myapp.domain.enumeration.ProspectStatus;
import com.mycompany.myapp.domain.enumeration.ReminderChannel;
import com.mycompany.myapp.repository.JobRunRepository;
import com.mycompany.myapp.repository.MemberRepository;
import com.mycompany.myapp.repository.ProspectEventRepository;
import com.mycompany.myapp.repository.ProspectOutcomeRepository;
import com.mycompany.myapp.repository.ProspectRepository;
import com.mycompany.myapp.service.dto.ProspectDtos.*;
import com.mycompany.myapp.service.util.Dates;
import com.mycompany.myapp.web.rest.errors.BadRequestAlertException;
import com.mycompany.myapp.web.rest.errors.NotFoundException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Prospects (module 6) : personnes intéressées, pas encore membres.
 * La « chance d'adhésion » monte à chaque interaction et baisse chaque jour sans nouvelles ;
 * à 0 % la fiche est supprimée (seuls des compteurs anonymes sont gardés).
 */
@Service
@Transactional
public class ProspectService {

    public static final String DECAY_JOB = "prospect-decay";
    private static final Logger LOG = LoggerFactory.getLogger(ProspectService.class);
    private static final String ENTITY = "prospect";
    private static final List<ProspectStatus> CLOSED = List.of(ProspectStatus.CONVERTED, ProspectStatus.LOST);
    private static final String DECAY_LABEL = "Aucune interaction depuis ";

    public static final Map<ProspectSource, String> SOURCE_LABELS = Map.of(
        ProspectSource.WALK_IN,
        "Passage à l'accueil",
        ProspectSource.REFERRAL,
        "Parrainage",
        ProspectSource.WORD_OF_MOUTH,
        "Bouche-à-oreille",
        ProspectSource.SOCIAL,
        "Réseaux sociaux",
        ProspectSource.FLYER,
        "Flyer",
        ProspectSource.OTHER,
        "Autre"
    );

    private final ProspectRepository repository;
    private final ProspectEventRepository eventRepository;
    private final ProspectOutcomeRepository outcomeRepository;
    private final JobRunRepository jobRunRepository;
    private final MemberRepository memberRepository;
    private final SettingsService settingsService;

    public ProspectService(
        ProspectRepository repository,
        ProspectEventRepository eventRepository,
        ProspectOutcomeRepository outcomeRepository,
        JobRunRepository jobRunRepository,
        MemberRepository memberRepository,
        SettingsService settingsService
    ) {
        this.repository = repository;
        this.eventRepository = eventRepository;
        this.outcomeRepository = outcomeRepository;
        this.jobRunRepository = jobRunRepository;
        this.memberRepository = memberRepository;
        this.settingsService = settingsService;
    }

    /** TODAY : à relancer aujourd'hui ; OPEN : tous en cours ; CLOSED : convertis et perdus. */
    @Transactional(readOnly = true)
    public List<ProspectDTO> list(String scope) {
        GymSettings s = settingsService.get();
        if ("CLOSED".equalsIgnoreCase(scope)) {
            return repository.findAllByStatusInOrderByClosedAtDesc(CLOSED).stream().map(p -> toDto(p, s)).toList();
        }
        List<ProspectDTO> open = repository.findAllByStatusNotInOrderByScoreDesc(CLOSED).stream().map(p -> toDto(p, s)).toList();
        return "TODAY".equalsIgnoreCase(scope) ? open.stream().filter(ProspectDTO::dueToday).toList() : open;
    }

    @Transactional(readOnly = true)
    public List<ProspectDTO> search(String query) {
        String q = query == null ? "" : query.trim();
        if (q.isEmpty()) return List.of();
        String digits = Dates.digits(q);
        GymSettings s = settingsService.get();
        return repository.search(q, digits.length() >= 2 ? digits : "", CLOSED).stream().limit(8).map(p -> toDto(p, s)).toList();
    }

    @Transactional(readOnly = true)
    public ProspectDTO get(Long id) {
        return toDto(find(id), settingsService.get());
    }

    @Transactional(readOnly = true)
    public List<ProspectEventDTO> events(Long id) {
        return repository
            .findEvents(id)
            .stream()
            .map(e -> new ProspectEventDTO(e.getId(), e.getLabel(), e.getDelta(), e.getCreatedAt(), e.getCreatedBy()))
            .toList();
    }

    public ProspectDTO create(ProspectRequest req) {
        String key = Dates.phoneKey(req.phone());
        if (key.length() < 8) {
            throw new BadRequestAlertException("Indiquez un numéro de téléphone complet", ENTITY, "phoneinvalid");
        }
        checkPhoneFree(key, null);
        GymSettings s = settingsService.get();
        Prospect p = new Prospect();
        apply(p, req);
        p.setStatus(ProspectStatus.NEW);
        p.setFirstContactDate(Dates.today());
        p.setScore(initialScore(req.source(), s));
        p.setNextFollowUp(Dates.today().plusDays(1));
        p.setCreatedBy(MemberViews.currentAgent());
        repository.save(p);
        addEvent(p, "Premier contact : " + SOURCE_LABELS.get(req.source()) + " (" + p.getScore() + " %)", null);
        return toDto(p, s);
    }

    public ProspectDTO update(Long id, ProspectRequest req) {
        Prospect p = find(id);
        checkPhoneFree(Dates.phoneKey(req.phone()), id);
        apply(p, req);
        return toDto(p, settingsService.get());
    }

    /** Le prospect a montré de l'intérêt : la chance monte et le délai de grâce repart de zéro. */
    public ProspectDTO interaction(Long id, Interaction type) {
        Prospect p = findOpen(id);
        GymSettings s = settingsService.get();
        int points =
            switch (type) {
                case REPLY -> s.getPointsReply();
                case VISIT -> s.getPointsVisit();
                case TRIAL -> s.getPointsTrial();
            };
        String label =
            switch (type) {
                case REPLY -> "A répondu à un message";
                case VISIT -> "A demandé un tarif ou visité la salle";
                case TRIAL -> "Séance d'essai faite";
            };
        p.setScore(Math.min(100, p.getScore() + points));
        p.setLastInteractionAt(Instant.now());
        if (type == Interaction.TRIAL) p.setStatus(ProspectStatus.TRIAL);
        else if (p.getStatus() == ProspectStatus.NEW) p.setStatus(ProspectStatus.CONTACTED);
        addEvent(p, label, points);
        return toDto(p, s);
    }

    /** Relance envoyée (J+1, puis J+3, puis J+7) : planifie la suivante. */
    public ProspectDTO followUp(Long id, ReminderChannel channel) {
        Prospect p = findOpen(id);
        int step = p.getFollowUpStep() + 1;
        String template = step == 1 ? "J+1" : step == 2 ? "J+3" : "J+7";
        p.setFollowUpStep(step);
        LocalDate today = Dates.today();
        p.setNextFollowUp(step == 1 ? today.plusDays(2) : step == 2 ? today.plusDays(4) : null);
        if (p.getStatus() == ProspectStatus.NEW) p.setStatus(ProspectStatus.CONTACTED);
        addEvent(p, "Relance " + template + " par " + (channel == ReminderChannel.WHATSAPP ? "WhatsApp" : "SMS"), null);
        return toDto(p, settingsService.get());
    }

    public ProspectDTO lose(Long id) {
        Prospect p = findOpen(id);
        p.setStatus(ProspectStatus.LOST);
        p.setClosedAt(Instant.now());
        p.setNextFollowUp(null);
        recordOutcome(p, ProspectOutcomeType.LOST);
        addEvent(p, "Marqué perdu par " + MemberViews.currentAgent(), null);
        return toDto(p, settingsService.get());
    }

    /** Appelé par l'inscription d'un membre créé à partir de ce prospect. */
    public void markConverted(Long prospectId, Long memberId) {
        Prospect p = findOpen(prospectId);
        p.setStatus(ProspectStatus.CONVERTED);
        p.setConvertedMemberId(memberId);
        p.setClosedAt(Instant.now());
        p.setNextFollowUp(null);
        p.setScore(100);
        recordOutcome(p, ProspectOutcomeType.CONVERTED);
        addEvent(p, "Inscrit comme membre", null);
    }

    @Transactional(readOnly = true)
    public List<SourceStatsDTO> stats() {
        Map<ProspectSource, long[]> counts = new EnumMap<>(ProspectSource.class);
        Map<ProspectSource, double[]> days = new EnumMap<>(ProspectSource.class);
        for (Object[] row : outcomeRepository.statsBySourceAndOutcome()) {
            ProspectSource source = (ProspectSource) row[0];
            ProspectOutcomeType outcome = (ProspectOutcomeType) row[1];
            long n = (Long) row[2];
            counts.computeIfAbsent(source, k -> new long[3])[outcome.ordinal()] += n;
            if (outcome == ProspectOutcomeType.CONVERTED && row[3] != null) {
                days.put(source, new double[] { ((Number) row[3]).doubleValue() });
            }
        }
        return Arrays.stream(ProspectSource.values())
            .map(src -> {
                long[] c = counts.getOrDefault(src, new long[3]);
                double[] d = days.get(src);
                return new SourceStatsDTO(src, c[0], c[1], c[2], d == null ? null : d[0]);
            })
            .toList();
    }

    /**
     * Script de nettoyage quotidien :
     * 1. sans interaction depuis plus que le délai de grâce → la chance baisse ;
     * 2. sous le seuil d'alerte → signalé (champ lastChance, affiché à l'accueil) ;
     * 3. à 0 % → fiche supprimée, après avoir gardé un compteur anonyme ;
     * 4. l'exécution est journalisée sans donnée personnelle.
     * Une seule exécution par jour (protection si la tâche est relancée à la main).
     */
    public JobRun runDecay() {
        LocalDate today = Dates.today();
        boolean alreadyRan = jobRunRepository
            .findAll()
            .stream()
            .anyMatch(r -> DECAY_JOB.equals(r.getJobName()) && Dates.dayOf(r.getRanAt()).equals(today));
        if (alreadyRan) {
            throw new BadRequestAlertException("Le nettoyage des prospects a déjà été fait aujourd'hui", ENTITY, "alreadyran");
        }
        GymSettings s = settingsService.get();
        int updated = 0;
        int deleted = 0;
        for (Prospect p : repository.findAllByStatusNotInOrderByScoreDesc(CLOSED)) {
            long idle = ChronoUnit.DAYS.between(Dates.dayOf(p.getLastInteractionAt()), today);
            if (idle <= s.getGraceDays() || s.getDecayPerDay() == 0) continue;
            int score = Math.max(0, p.getScore() - s.getDecayPerDay());
            if (score <= 0) {
                recordOutcome(p, ProspectOutcomeType.EXPIRED);
                repository.delete(p); // l'historique part avec (clé étrangère ON DELETE CASCADE)
                deleted++;
            } else {
                p.setScore(score);
                recordDecay(p, idle, s.getDecayPerDay());
                updated++;
            }
        }
        JobRun run = new JobRun();
        run.setJobName(DECAY_JOB);
        run.setUpdatedCount(updated);
        run.setDeletedCount(deleted);
        run.setDetails("Baisse de " + s.getDecayPerDay() + " points après " + s.getGraceDays() + " jours sans interaction");
        LOG.info("Nettoyage des prospects : {} mis à jour, {} supprimés", updated, deleted);
        return jobRunRepository.save(run);
    }

    // ---------------------------------------------------------------------------------------------

    private Prospect find(Long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Prospect introuvable"));
    }

    private Prospect findOpen(Long id) {
        Prospect p = find(id);
        if (p.isClosed()) throw new BadRequestAlertException("Ce prospect est déjà converti ou perdu", ENTITY, "closed");
        return p;
    }

    private void apply(Prospect p, ProspectRequest req) {
        p.setName(StringUtils.hasText(req.name()) ? req.name().trim() : null);
        p.setPhone(req.phone().trim());
        p.setPhoneDigits(Dates.digits(req.phone()));
        p.setSource(req.source());
        p.setInterestedPlan(StringUtils.hasText(req.interestedPlan()) ? req.interestedPlan().trim() : null);
        p.setNotes(StringUtils.hasText(req.notes()) ? req.notes().trim() : null);
    }

    /** Un numéro = une personne : ni un autre prospect, ni un membre existant. */
    private void checkPhoneFree(String key, Long currentId) {
        repository
            .findByPhoneSuffix(key)
            .stream()
            .filter(other -> !other.getId().equals(currentId))
            .findFirst()
            .ifPresent(other -> {
                throw new BadRequestAlertException(
                    "Ce numéro existe déjà : " + (other.getName() != null ? other.getName() : "prospect sans nom") + ". Ouvrez sa fiche plutôt que d'en créer une nouvelle.",
                    ENTITY,
                    "phoneexists"
                );
            });
        if (currentId == null) {
            memberRepository
                .findByPhoneSuffix(key)
                .stream()
                .findFirst()
                .ifPresent(m -> {
                    throw new BadRequestAlertException(
                        "Ce numéro est celui d'un membre : " + MemberViews.fullName(m) + " (" + m.getMemberNumber() + ")",
                        ENTITY,
                        "alreadymember"
                    );
                });
        }
    }

    private static int initialScore(ProspectSource source, GymSettings s) {
        return switch (source) {
            case WALK_IN -> s.getScoreWalkIn();
            case REFERRAL -> s.getScoreReferral();
            case WORD_OF_MOUTH -> s.getScoreWordOfMouth();
            case SOCIAL -> s.getScoreSocial();
            case FLYER -> s.getScoreFlyer();
            case OTHER -> s.getScoreOther();
        };
    }

    private void addEvent(Prospect p, String label, Integer delta) {
        ProspectEvent e = new ProspectEvent();
        e.setProspect(p);
        e.setLabel(label);
        e.setDelta(delta);
        e.setCreatedBy(MemberViews.currentAgent());
        eventRepository.save(e);
    }

    /** Une seule ligne « Aucune interaction depuis N jours » mise à jour chaque jour, plutôt qu'une ligne par jour. */
    private void recordDecay(Prospect p, long idleDays, int decay) {
        List<ProspectEvent> events = repository.findEvents(p.getId());
        ProspectEvent last = events.isEmpty() ? null : events.get(events.size() - 1);
        if (last != null && last.getLabel().startsWith(DECAY_LABEL)) {
            last.setLabel(DECAY_LABEL + idleDays + " jours");
            last.setDelta((last.getDelta() == null ? 0 : last.getDelta()) - decay);
            last.setCreatedAt(Instant.now());
        } else {
            ProspectEvent e = new ProspectEvent();
            e.setProspect(p);
            e.setLabel(DECAY_LABEL + idleDays + " jours");
            e.setDelta(-decay);
            e.setCreatedBy("système");
            eventRepository.save(e);
        }
    }

    private void recordOutcome(Prospect p, ProspectOutcomeType type) {
        ProspectOutcome o = new ProspectOutcome();
        o.setSource(p.getSource());
        o.setOutcome(type);
        o.setDaysToDecision((int) ChronoUnit.DAYS.between(p.getFirstContactDate(), Dates.today()));
        outcomeRepository.save(o);
    }

    private ProspectDTO toDto(Prospect p, GymSettings s) {
        boolean open = !p.isClosed();
        boolean lastChance = open && p.getScore() < s.getAlertThreshold();
        boolean due = open && (lastChance || (p.getNextFollowUp() != null && !p.getNextFollowUp().isAfter(Dates.today())));
        return new ProspectDTO(
            p.getId(),
            p.getName(),
            p.getPhone(),
            p.getSource(),
            p.getStatus(),
            p.getFirstContactDate(),
            p.getInterestedPlan(),
            p.getNotes(),
            p.getScore(),
            p.getLastInteractionAt(),
            p.getNextFollowUp(),
            p.getFollowUpStep(),
            p.getConvertedMemberId(),
            p.getClosedAt(),
            due,
            lastChance
        );
    }
}
