package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.ProspectOutcome;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProspectOutcomeRepository extends JpaRepository<ProspectOutcome, Long> {
    /** [source, issue, nombre, délai moyen en jours] */
    @Query("select o.source, o.outcome, count(o), avg(o.daysToDecision) from ProspectOutcome o group by o.source, o.outcome")
    List<Object[]> statsBySourceAndOutcome();
}
