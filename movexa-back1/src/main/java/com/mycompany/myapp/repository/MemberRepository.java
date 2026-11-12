package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.Member;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MemberRepository extends JpaRepository<Member, Long> {
    /**
     * @EntityGraph charge le user dans la même requête (JOIN) :
     * sans ça, afficher 50 membres déclencherait 1 + 50 requêtes (problème « N+1 »).
     * Les membres archivés sont exclus des listes.
     */
    @EntityGraph(attributePaths = "user")
    Page<Member> findAllByArchivedFalse(Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Optional<Member> findWithUserById(Long id);

    @EntityGraph(attributePaths = "user")
    Optional<Member> findOneWithUserByQrTokenAndArchivedFalse(String qrToken);

    @EntityGraph(attributePaths = "user")
    List<Member> findAllWithUserByIdIn(List<Long> ids);

    /** Recherche par nom, prénom, numéro de membre ou chiffres du téléphone. */
    @EntityGraph(attributePaths = "user")
    @Query(
        "select m from Member m where m.archived = false and (" +
        "lower(concat(m.user.firstName, ' ', m.user.lastName)) like lower(concat('%', :q, '%')) " +
        "or lower(concat(m.user.lastName, ' ', m.user.firstName)) like lower(concat('%', :q, '%')) " +
        "or lower(m.memberNumber) like lower(concat('%', :q, '%')) " +
        "or (:digits <> '' and m.user.phoneDigits like concat('%', :digits, '%'))) " +
        "order by m.user.lastName, m.user.firstName"
    )
    List<Member> search(@Param("q") String q, @Param("digits") String digits, Pageable pageable);

    /** Doublon : même fin de numéro (les 8 derniers chiffres, avec ou sans indicatif +229 / 01). */
    @EntityGraph(attributePaths = "user")
    @Query("select m from Member m where m.archived = false and m.user.phoneDigits like concat('%', :suffix)")
    List<Member> findByPhoneSuffix(@Param("suffix") String suffix);

    /** Membres dont la fin tombe entre deux dates (incluses), les plus proches d'abord. */
    @EntityGraph(attributePaths = "user")
    @Query("select m from Member m where m.archived = false and m.expiryDate between :from and :to order by m.expiryDate asc")
    List<Member> findEndingBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    /** Membres expirés, les plus récemment expirés d'abord. */
    @EntityGraph(attributePaths = "user")
    @Query("select m from Member m where m.archived = false and m.expiryDate < :today order by m.expiryDate desc")
    List<Member> findExpired(@Param("today") LocalDate today, Pageable pageable);

    long countByArchivedFalseAndExpiryDateGreaterThanEqual(LocalDate date);

    long countByArchivedFalseAndExpiryDateLessThan(LocalDate date);

    long countByArchivedFalseAndExpiryDateBetween(LocalDate from, LocalDate to);

    long countByArchivedFalseAndJoinDateGreaterThanEqual(LocalDate date);
}
