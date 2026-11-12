package com.mycompany.myapp.repository;

import com.mycompany.myapp.domain.Payment;
import com.mycompany.myapp.domain.enumeration.PaymentMethod;
import com.mycompany.myapp.domain.enumeration.PaymentStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    /** Paiements saisis sur une période (y compris annulés), du plus récent au plus ancien. */
    @EntityGraph(attributePaths = { "member", "member.user" })
    List<Payment> findAllByCreatedAtBetweenOrderByCreatedAtDesc(Instant from, Instant to);

    @EntityGraph(attributePaths = { "member", "member.user" })
    List<Payment> findAllByMethodAndCreatedAtAfterOrderByCreatedAtDesc(PaymentMethod method, Instant after);

    @EntityGraph(attributePaths = { "member", "member.user", "subscription" })
    Optional<Payment> findWithDetailsById(Long id);

    Optional<Payment> findOneByLinkToken(String linkToken);

    Optional<Payment> findOneByTransactionId(String transactionId);

    @EntityGraph(attributePaths = { "subscription" })
    List<Payment> findAllByMemberIdOrderByCreatedAtDesc(Long memberId);

    /** Total encaissé par moyen de paiement sur une période : [moyen, somme, nombre]. */
    @Query(
        "select p.method, coalesce(sum(p.amount), 0), count(p) from Payment p " +
        "where p.status = com.mycompany.myapp.domain.enumeration.PaymentStatus.PAID and p.paidAt >= :from and p.paidAt < :to " +
        "group by p.method"
    )
    List<Object[]> sumPaidByMethod(@Param("from") Instant from, @Param("to") Instant to);

    long countByStatusAndCancelledAtBetween(PaymentStatus status, Instant from, Instant to);

    /** Paiements encaissés pour ces membres depuis une date (pour savoir si une relance a abouti). */
    @Query(
        "select p from Payment p where p.member.id in :memberIds and p.status = com.mycompany.myapp.domain.enumeration.PaymentStatus.PAID " +
        "and p.paidAt >= :since order by p.paidAt asc"
    )
    List<Payment> findPaidForMembersSince(@Param("memberIds") Collection<Long> memberIds, @Param("since") Instant since);

    @Query(value = "select nextval('receipt_seq')", nativeQuery = true)
    long nextReceiptNumber();
}
