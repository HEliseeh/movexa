package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.Prospect;
import com.mycompany.myapp.domain.ProspectEvent;
import com.mycompany.myapp.domain.enumeration.ProspectStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProspectRepository extends JpaRepository<Prospect, Long> {
    List<Prospect> findAllByStatusNotInOrderByScoreDesc(Collection<ProspectStatus> statuses);

    List<Prospect> findAllByStatusInOrderByClosedAtDesc(Collection<ProspectStatus> statuses);

    /** Doublon : même fin de numéro (les 8 derniers chiffres, avec ou sans indicatif +229 / 01). */
    @Query("select p from Prospect p where p.phoneDigits like concat('%', :suffix)")
    List<Prospect> findByPhoneSuffix(@Param("suffix") String suffix);

    @Query(
        "select p from Prospect p where p.status not in :closed and " +
        "(lower(coalesce(p.name, '')) like lower(concat('%', :q, '%')) or (:digits <> '' and p.phoneDigits like concat('%', :digits, '%')))"
    )
    List<Prospect> search(@Param("q") String q, @Param("digits") String digits, @Param("closed") Collection<ProspectStatus> closed);

    @Query("select e from ProspectEvent e where e.prospect.id = :prospectId order by e.createdAt asc, e.id asc")
    List<ProspectEvent> findEvents(@Param("prospectId") Long prospectId);
}
