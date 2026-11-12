package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.Plan;
import com.mycompany.myapp.repository.PlanRepository;
import com.mycompany.myapp.service.dto.PlanDTO;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Catalogue des formules. Une formule n'est jamais supprimée (elle figure dans l'historique) :
 * on la désactive pour ne plus la proposer.
 */
@Service
@Transactional
public class PlanService {

    private final PlanRepository repository;

    public PlanService(PlanRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<PlanDTO> list(boolean includeInactive) {
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : repository.countMembersByPlanName()) {
            counts.put((String) row[0], (Long) row[1]);
        }
        List<Plan> plans = includeInactive
            ? repository.findAllByOrderByDurationDaysAscPriceAsc()
            : repository.findAllByActiveTrueOrderByDurationDaysAscPriceAsc();
        return plans.stream().map(p -> toDto(p, counts.getOrDefault(p.getName(), 0L))).toList();
    }

    public PlanDTO create(PlanDTO dto) {
        Plan plan = new Plan();
        apply(plan, dto);
        return toDto(repository.save(plan), 0L);
    }

    public Optional<PlanDTO> update(Long id, PlanDTO dto) {
        return repository
            .findById(id)
            .map(plan -> {
                apply(plan, dto);
                return toDto(plan, null);
            });
    }

    private void apply(Plan plan, PlanDTO dto) {
        plan.setName(dto.name().trim());
        plan.setPrice(dto.price());
        plan.setDurationDays(dto.durationDays());
        plan.setActive(dto.active() == null || dto.active());
    }

    private static PlanDTO toDto(Plan p, Long memberCount) {
        return new PlanDTO(p.getId(), p.getName(), p.getPrice(), p.getDurationDays(), p.isActive(), memberCount);
    }
}
