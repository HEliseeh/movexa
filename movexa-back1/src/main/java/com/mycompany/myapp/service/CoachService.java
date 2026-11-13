package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.Coach;
import com.mycompany.myapp.repository.CoachRepository;
import com.mycompany.myapp.service.dto.CoachDTO;
import com.mycompany.myapp.web.rest.errors.NotFoundException;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Équipe des coachs : création, modification, suppression.
 * Supprimer un coach ne touche pas aux membres : ils perdent seulement leur coach.
 */
@Service
@Transactional
public class CoachService {

    private final CoachRepository repository;

    public CoachService(CoachRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<CoachDTO> list() {
        Map<Long, Long> counts = memberCounts();
        return repository.findAllByOrderByActiveDescFirstNameAscLastNameAsc().stream().map(c -> toDto(c, counts.getOrDefault(c.getId(), 0L))).toList();
    }

    @Transactional(readOnly = true)
    public Optional<CoachDTO> findOne(Long id) {
        return repository.findById(id).map(c -> toDto(c, memberCounts().getOrDefault(id, 0L)));
    }

    @Transactional(readOnly = true)
    public List<String> disciplines() {
        return repository.findAllDisciplines();
    }

    public CoachDTO create(CoachDTO dto) {
        Coach coach = new Coach();
        apply(coach, dto);
        return toDto(repository.save(coach), 0L);
    }

    public Optional<CoachDTO> update(Long id, CoachDTO dto) {
        return repository
            .findById(id)
            .map(coach -> {
                String before = coach.getFullName();
                apply(coach, dto);
                if (!before.equals(coach.getFullName())) repository.renameOnMembers(id, coach.getFullName());
                return toDto(coach, memberCounts().getOrDefault(id, 0L));
            });
    }

    public void delete(Long id) {
        Coach coach = repository.findById(id).orElseThrow(() -> new NotFoundException("Coach introuvable"));
        repository.detachMembers(id);
        repository.delete(coach);
    }

    /** Pour la fiche membre : le coach choisi doit exister */
    @Transactional(readOnly = true)
    public Coach require(Long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Coach introuvable"));
    }

    // ---------------------------------------------------------------------------------------------

    private void apply(Coach coach, CoachDTO dto) {
        coach.setFirstName(dto.firstName().trim());
        coach.setLastName(trimToNull(dto.lastName()));
        coach.setPhone(trimToNull(dto.phone()));
        coach.setEmail(dto.email() == null ? null : trimToNull(dto.email().toLowerCase()));
        coach.setNotes(trimToNull(dto.notes()));
        coach.setActive(dto.active() == null || dto.active());
        // Disciplines : nettoyées, sans doublon (sans tenir compte des majuscules), dans l'ordre saisi
        Map<String, String> unique = new LinkedHashMap<>();
        if (dto.disciplines() != null) {
            for (String d : dto.disciplines()) {
                String clean = trimToNull(d);
                if (clean != null) unique.putIfAbsent(clean.toLowerCase(Locale.FRENCH), capitalize(clean));
            }
        }
        coach.getDisciplines().clear();
        coach.getDisciplines().addAll(unique.values());
    }

    private Map<Long, Long> memberCounts() {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : repository.countMembersByCoach()) counts.put((Long) row[0], (Long) row[1]);
        return counts;
    }

    private static CoachDTO toDto(Coach c, Long memberCount) {
        return new CoachDTO(
            c.getId(),
            c.getFirstName(),
            c.getLastName(),
            c.getPhone(),
            c.getEmail(),
            c.getNotes(),
            c.isActive(),
            List.copyOf(c.getDisciplines()),
            memberCount,
            c.getCreatedAt()
        );
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim().replaceAll("\\s+", " ") : null;
    }

    private static String capitalize(String s) {
        return s.substring(0, 1).toUpperCase(Locale.FRENCH) + s.substring(1);
    }
}
