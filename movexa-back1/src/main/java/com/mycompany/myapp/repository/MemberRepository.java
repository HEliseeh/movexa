package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.Member;
import com.mycompany.myapp.domain.enumeration.MemberStatus;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MemberRepository extends JpaRepository<Member, Long> {
    /**
     * @EntityGraph charge le user dans la même requête (JOIN) :
     * sans ça, afficher 50 membres déclencherait 1 + 50 requêtes (problème « N+1 »).
     */
    @Override
    @EntityGraph(attributePaths = "user")
    Page<Member> findAll(Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Page<Member> findAllByStatus(MemberStatus status, Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Optional<Member> findWithUserById(Long id);
}
