package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.Coach;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CoachRepository extends JpaRepository<Coach, Long> {
    List<Coach> findAllByOrderByActiveDescFirstNameAscLastNameAsc();

    /** Nombre de membres non archivés suivis par chaque coach : [coachId, nombre] */
    @Query("select m.coachId, count(m) from Member m where m.archived = false and m.coachId is not null group by m.coachId")
    List<Object[]> countMembersByCoach();

    /** Toutes les disciplines déjà saisies (suggestions du formulaire) */
    @Query("select distinct d from Coach c join c.disciplines d order by d")
    List<String> findAllDisciplines();

    /** Renommage : le nom affiché recopié sur les membres suit la fiche */
    @Modifying
    @Query("update Member m set m.coach = :name where m.coachId = :coachId")
    int renameOnMembers(@Param("coachId") Long coachId, @Param("name") String name);

    /** Suppression : les membres suivis n'ont plus de coach (la base fait aussi SET NULL sur coach_id) */
    @Modifying
    @Query("update Member m set m.coach = null, m.coachId = null where m.coachId = :coachId")
    int detachMembers(@Param("coachId") Long coachId);
}
