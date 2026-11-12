package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.Plan;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PlanRepository extends JpaRepository<Plan, Long> {
    List<Plan> findAllByOrderByDurationDaysAscPriceAsc();

    List<Plan> findAllByActiveTrueOrderByDurationDaysAscPriceAsc();

    /** Nombre de membres non archivés dont la formule en cours porte ce nom (à jour ou non). */
    @Query("select m.plan, count(m) from Member m where m.archived = false and m.plan is not null group by m.plan")
    List<Object[]> countMembersByPlanName();
}
