package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.Reminder;
import com.mycompany.myapp.domain.enumeration.ReminderRule;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {
    @EntityGraph(attributePaths = { "member", "member.user" })
    List<Reminder> findAllBySentAtAfterOrderBySentAtDesc(Instant after);

    List<Reminder> findAllByMemberIdOrderBySentAtDesc(Long memberId);

    boolean existsByMemberIdAndRuleAndTargetEndDate(Long memberId, ReminderRule rule, LocalDate targetEndDate);

    /** Relances déjà faites pour des échéances données : [memberId, règle, échéance]. */
    @Query("select r.member.id, r.rule, r.targetEndDate from Reminder r where r.targetEndDate >= :from")
    List<Object[]> findSentKeysSince(@Param("from") LocalDate from);

    /** Nombre de relances par membre : [memberId, nombre]. */
    @Query("select r.member.id, count(r) from Reminder r group by r.member.id")
    List<Object[]> countByMember();
}
